import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();
app.use(express.json());

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

app.post("/notion/create-note", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { title, content = "" } = req.body || {};

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        ok: false,
        error: "title is required",
      });
    }

    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        Name: {
          title: [
            {
              text: { content: title },
            },
          ],
        },
      },
      children: content
        ? [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: { content: content },
                  },
                ],
              },
            },
          ]
        : [],
    });

    res.json({
      ok: true,
      url: response.url,
      id: response.id,
    });
  } catch (e) {
    console.error("FULL ERROR:", e);
    console.error("MESSAGE:", e?.message);
    console.error("CAUSE:", e?.cause);

    res.status(500).json({
      ok: false,
      error: e?.message || "Unknown error",
      cause: e?.cause ? String(e.cause) : null,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Notion Notes API is running");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});