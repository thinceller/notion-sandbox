import { Client } from "@notionhq/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

const dailyNoteDatabaseId = process.env["NOTION_DAILY_NOTE_DATABASE_ID"] as string;
const currentDate = dayjs().tz().format("YYYY-MM-DD");
const previousDate = dayjs().tz().subtract(1, "day").format("YYYY-MM-DD");

/**
 * initialize notion client
 * @returns notion client
 */
function initClient() {
  return new Client({
    auth: process.env["NOTION_TOKEN"] as string,
  });
}

/**
 * get a page id of previous daily note
 * @param client notion client
 */
async function getPreviousPageId(client: Client) {
  const res = await client.databases.query({
    database_id: dailyNoteDatabaseId,
    filter: {
      property: 'title',
      rich_text: {
        equals: previousDate
      },
    },
  });

  if (!res.results[0]) {
    throw new Error('no previous page');
  }

  return res.results[0].id;
}

/**
 * create a new page in daily note database
 * @param client notion client
 */
function createNewPage(client: Client, previousPageId: string) {
  return client.pages.create({
    parent: {
      database_id: dailyNoteDatabaseId,
    },
    properties: {
      'title': {
        title: [
          {
            text: {
              content: currentDate
            },
          },
        ],
      },
      'タグ': {
        multi_select: [
          {
            name: 'Daily Notes',
          },
        ],
      },
      'Prev': {
        rich_text: [
          {
            type: 'mention',
            mention: {
              page: {
                id: previousPageId,
              },
            },
          },
        ],
      }
    },
  });
}

/**
 * update a prev property of previous daily note
 * @param client notion client
 * @param previousPageId a page id of previous daily note
 * @param currentDatePageId a page id of current daily note
 */
function updatePreviousPage(client: Client, previousPageId: string, currentDatePageId: string) {
  return client.pages.update({
    page_id: previousPageId,
    properties: {
      'Next': {
        rich_text: [
          {
            type: 'mention',
            mention: {
              page: {
                id: currentDatePageId,
              },
            },
          },
        ],
      },
    },
  });
}

async function main() {
  const client = initClient();

  const previousPageId = await getPreviousPageId(client);
  const res = await createNewPage(client, previousPageId);

  const currentDatePageId = res.id;
  await updatePreviousPage(client, previousPageId, currentDatePageId);
}

main();
