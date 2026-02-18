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
