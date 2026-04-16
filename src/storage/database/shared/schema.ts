import { pgTable, serial, timestamp, varchar, text, jsonb, integer, index, uuid, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户资料表（扩展 Supabase Auth）
export const profiles = pgTable(
	"profiles",
	{
		id: uuid("id").primaryKey(), // 直接对应 auth.users.id
		email: varchar("email", { length: 255 }).notNull(),
		subscriptionStatus: varchar("subscription_status", { length: 50 }).notNull().default("free"), // free, active, expired, banned
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [index("profiles_email_idx").on(table.email)]
);

// 邀请码表
export const inviteCodes = pgTable(
	"invite_codes",
	{
		id: serial().primaryKey(),
		code: varchar("code", { length: 20 }).notNull().unique(),
		usedBy: uuid("used_by"), // 关联 profiles.id
		usedAt: timestamp("used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		maxUses: integer("max_uses").notNull().default(1), // 允许使用次数
		currentUses: integer("current_uses").notNull().default(0), // 已使用次数
		isActive: boolean("is_active").notNull().default(true),
	},
	(table) => [
		index("invite_codes_code_idx").on(table.code),
		index("invite_codes_used_by_idx").on(table.usedBy)
	]
);

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
		userId: uuid("user_id").notNull(), // 用户ID，用于数据隔离
		name: varchar("name", { length: 100 }).notNull(), // 如 "Music", "Hometown"
		order: integer("order").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("topics_part_id_idx").on(table.partId),
		index("topics_order_idx").on(table.order),
		index("topics_user_id_idx").on(table.userId)
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
