import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import sequelize from "../config/database";

(async () => {
  const [rows] = await sequelize.query(`
    SELECT source, source_id, COUNT(*) AS chunks
    FROM knowledge_base
    WHERE source = 'pdf'
    GROUP BY source_id, source
    ORDER BY source_id
  `);

  console.log("\n📄 PDFs in DB:\n");
  console.table(rows);

  process.exit(0);
})();
