# services/graph_service.py
from neo4j import GraphDatabase
import os

driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)

def create_graph(data):
    with driver.session() as session:
        for concept in data["concepts"]:
            session.run("""
                MERGE (c:Concept {name:$name})
                SET c.definition=$definition
            """, name=concept["name"], definition=concept["definition"])

def get_related_concepts(question):
    with driver.session() as session:
        result = session.run("""
            MATCH (c:Concept)
            WHERE toLower(c.name) CONTAINS toLower($q)
            RETURN c.name, c.definition
        """, q=question)

        concepts = []
        for record in result:
            concepts.append(
                f"{record['c.name']}: {record['c.definition']}"
            )

    return "\n".join(concepts)
