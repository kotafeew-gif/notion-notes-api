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
    const {
      title,
      content = "",
      type = "",
      language = "",
      genre = [],
      prompt = "",
      cover = "",
      notes = ""
    } = req.body;

    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        "Название": { title: [{ text: { content: title } }] },
        "Статус": { select: { name: type } },
        "Язык": { select: { name: language } },
        "Жанр": { multi_select: genre.map(g => ({ name: g })) },
        "Промпт Suno": { rich_text: [{ text: { content: prompt } }] },
        "Текст песни": { rich_text: [{ text: { content } }] },
        "Заметки": { rich_text: [{ text: { content: notes } }] }
      }
    });

    // Добавляем обложку если есть
    if (cover) {
      await notion.blocks.children.append({
        block_id: response.id,
        children: [
          {
            object: "block",
            type: "image",
            image: { type: "external", external: { url: cover } }
          }
        ]
      });
    }

    res.json({
      ok: true,
      url: response.url,
      id: response.id,
      type,
      language,
      genre,
      prompt,
      cover,
      notes
    });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: e.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});