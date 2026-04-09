import { pgTable, serial, timestamp, varchar, text, jsonb, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Part 1/2/3 分类表
export const parts = pgTable(
	"parts",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 50 }).notNull(), // "Part 1", "Part 2", "Part 3"
		order: integer("order").notNull().default(1), // 排序
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [index("parts_order_idx").on(table.order)]
);

// 话题表
export const topics = pgTable(
	"topics",
	{
		id: serial().primaryKey(),
		partId: integer("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(), // 如 "Music", "Hometown"
		order: integer("order").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("topics_part_id_idx").on(table.partId),
		index("topics_order_idx").on(table.order)
	]
);

// 卡片表
export const cards = pgTable(
	"cards",
	{
		id: serial().primaryKey(),
		topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
		title: text("title").notNull(), // 卡片标题，如 "Describe a song that is meaningful to you"
		order: integer("order").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("cards_topic_id_idx").on(table.topicId),
		index("cards_order_idx").on(table.order)
	]
);

// 问题表
export const questions = pgTable(
	"questions",
	{
		id: serial().primaryKey(),
		cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
		content: text("content").notNull(), // 问题内容，如 "Why is this song meaningful to you?"
		audioUrl: text("audio_url"), // 音频文件URL（对象存储）
		englishTranscript: text("english_transcript"), // 英文原文
		chineseTranslation: text("chinese_translation"), // 中文翻译
		sentences: jsonb("sentences").$type<Array<{
			text: string;
			start: number;
			end: number;
		}>>(), // 时间戳句子数组
		note: text("note"), // 用户笔记
		order: integer("order").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("questions_card_id_idx").on(table.cardId),
		index("questions_order_idx").on(table.order)
	]
);
