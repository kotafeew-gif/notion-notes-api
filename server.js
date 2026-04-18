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

// Поиск существующей страницы по названию
async function findPageByTitle(title) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: "Название",
      title: {
        equals: title
      }
    }
  });
  return response.results[0]; // Возвращаем первую найденную запись
}

app.post("/notion/create-or-update-note", async (req, res) => {
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

    let page = await findPageByTitle(title);

    if (page) {
      // Обновляем существующую страницу
      await notion.pages.update({
        page_id: page.id,
        properties: {
          "Статус": { select: { name: type } },
          "Язык": { select: { name: language } },
          "Жанр": { multi_select: genre.map(g => ({ name: g })) },
          "Промпт Suno": { rich_text: [{ text: { content: prompt } }] },
          "Текст песни": { rich_text: [{ text: { content } }] },
          "Заметки": { rich_text: [{ text: { content: notes } }] }
        }
      });

      if (cover) {
        await notion.blocks.children.append({
          block_id: page.id,
          children: [
            {
              object: "block",
              type: "image",
              image: { type: "external", external: { url: cover } }
            }
          ]
        });
      }

      return res.json({
        ok: true,
        url: page.url,
        id: page.id,
        message: "Updated existing song"
      });
    } else {
      // Создаём новую запись
      const newPage = await notion.pages.create({
        parent: { database_id: DATABASE_ID },
        properties: {
          "Название": { title: [{ text: { content: title } }] },
          "Статус": { select: { name: type } },
          "Язык": { select: { name: language } },
          "Жанр": { multi_select: genre.map(g => ({ name: g })) },
          "Промпт Suno": { rich_text: [{ text: { content: prompt } }] },
          "Текст песни": { rich_text: [{ text: { content } }] },
          "Заметки": { rich_text: [{ text: { content: notes } }] }
        },
        children: cover
          ? [
              {
                object: "block",
                type: "image",
                image: { type: "external", external: { url: cover } }
              }
            ]
          : []
      });

      return res.json({
        ok: true,
        url: newPage.url,
        id: newPage.id,
        message: "Created new song"
      });
    }
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: e.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});