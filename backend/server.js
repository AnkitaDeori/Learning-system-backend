require("dotenv").config();
const express = require("express");
const neo4j = require("neo4j-driver");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to Neo4j
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME,
    process.env.NEO4J_PASSWORD
  )
);

// Verify connection on startup
(async () => {
  try {
    await driver.verifyConnectivity();
    console.log("✅ Neo4j Connected Successfully");
  } catch (error) {
    console.error("❌ Neo4j Connection Failed:", error);
  }
})();


const session = driver.session({ database: "neo4j" });

// Test Route
app.get("/", (req, res) => {
  res.send("Neo4j Connected Backend Running 🚀");
});

// Create User Route
app.post("/create-user", async (req, res) => {
  const { userId, name } = req.body;

  try {
    await session.run(
      `
      CREATE (u:User {userId: $userId, name: $name})
      RETURN u
      `,
      { userId, name }
    );

    res.json({ message: "User created successfully!" });
  } catch (error) {
  console.error("FULL ERROR:", error);
  res.status(500).json({ error: error.message });
}

});

// Get All Users
app.get("/users", async (req, res) => {
  try {
    const result = await session.run(
      `MATCH (u:User) RETURN u`
    );

    const users = result.records.map(record => record.get("u").properties);

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.get("/lesson-graph/:lessonId", async (req, res) => {
  const { lessonId } = req.params;
  const session = driver.session({ database: "neo4j" });

  try {
    const result = await session.run(
      `
      MATCH (l:Lesson {lessonId: $lessonId})-[:HAS_CONCEPT]->(c:Concept)
      OPTIONAL MATCH (c)-[r]->(related:Concept)
      RETURN l, c, r, related
      `,
      { lessonId }
    );

    const nodesMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const lesson = record.get("l");
      const concept = record.get("c");
      const related = record.get("related");
      const rel = record.get("r");

      if (lesson) {
        nodesMap.set(lesson.elementId, {
          id: lesson.elementId,
          label: lesson.properties.title,
          type: "Lesson"
        });
      }

      if (concept) {
        nodesMap.set(concept.elementId, {
          id: concept.elementId,
          label: concept.properties.name,
          type: "Concept"
        });
      }

      if (related) {
        nodesMap.set(related.elementId, {
          id: related.elementId,
          label: related.properties.name,
          type: "Concept"
        });
      }

      if (rel) {
        links.push({
          source: rel.startNodeElementId,
          target: rel.endNodeElementId,
          label: rel.type
        });
      }
    });

    res.json({
      nodes: Array.from(nodesMap.values()),
      links
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});


app.post("/create-lesson", async (req, res) => {
  const { lessonId, title } = req.body;
  const session = driver.session({ database: "neo4j" });

  try {
    await session.run(
      `
      MERGE (l:Lesson {lessonId: $lessonId})
      SET l.title = $title,
          l.createdAt = datetime()
      RETURN l
      `,
      { lessonId, title }
    );

    res.json({ message: "Lesson created successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.post("/add-concept", async (req, res) => {
  const { lessonId, conceptName, definition } = req.body;
  const session = driver.session({ database: "neo4j" });

  try {
    await session.run(
      `
      MATCH (l:Lesson {lessonId: $lessonId})
      MERGE (c:Concept {name: $conceptName})
      SET c.definition = $definition
      MERGE (l)-[:HAS_CONCEPT]->(c)
      RETURN c
      `,
      { lessonId, conceptName, definition }
    );

    res.json({ message: "Concept added successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.post("/add-relationship", async (req, res) => {
  const { fromConcept, toConcept, relationType } = req.body;
  const session = driver.session({ database: "neo4j" });

  try {
    const query = `
      MATCH (a:Concept {name: $fromConcept})
      MATCH (b:Concept {name: $toConcept})
      MERGE (a)-[r:${relationType}]->(b)
      RETURN a,b
    `;

    await session.run(query, { fromConcept, toConcept });

    res.json({ message: "Relationship created!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

const axios = require("axios");

app.post("/extract-concepts", async (req, res) => {
  const { lessonId, text } = req.body;
  const session = driver.session({ database: "neo4j" });

  try {
    // Call Groq API
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
  {
    role: "system",
    content: "You are a strict JSON generator. Only return valid JSON. No explanations."
  },
  {
    role: "user",
    content: `
Extract key concepts and relationships from this lesson.

Return STRICT JSON in this format:

{
  "concepts": [
    { "name": "string", "definition": "string" }
  ],
  "relationships": [
    { "source": "string", "relation": "string", "target": "string" }
  ]
}

Lesson:
${text}
    `
  }
],

        temperature: 0.2
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiContent = response.data.choices[0].message.content;

    const parsed = JSON.parse(aiContent);

    // Insert Concepts
    for (let concept of parsed.concepts) {
      await session.run(
        `
        MATCH (l:Lesson {lessonId: $lessonId})
        MERGE (c:Concept {name: $name})
        SET c.definition = $definition
        MERGE (l)-[:HAS_CONCEPT]->(c)
        `,
        {
          lessonId,
          name: concept.name,
          definition: concept.definition
        }
      );
    }

    // Insert Relationships
    for (let rel of parsed.relationships) {
      await session.run(
        `
        MATCH (a:Concept {name: $source})
        MATCH (b:Concept {name: $target})
        MERGE (a)-[:${rel.relation}]->(b)
        `,
        {
          source: rel.source,
          target: rel.target
        }
      );
    }

    res.json({ message: "Concepts extracted and stored!" });

  } catch (error) {
  console.error("Groq Error Data:", error.response?.data);
  console.error("Groq Error Status:", error.response?.status);
  res.status(500).json({ error: error.response?.data || error.message });
}

});


app.listen(5000, () => {
  console.log("Server running on port 5000");
});
