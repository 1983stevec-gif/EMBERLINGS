import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const players=sqliteTable('players',{
 userId:text('user_id').primaryKey(),recoveryHash:text('recovery_hash'),username:text('username').notNull(),usernameKey:text('username_key').notNull(),
 petRarity:text('pet_rarity').notNull().default('Common'),petSecret:integer('pet_secret').notNull().default(0),petKind:integer('pet_kind').notNull().default(0),petShiny:integer('pet_shiny').notNull().default(0),seenAt:integer('seen_at').notNull(),createdAt:integer('created_at').notNull()
},t=>[uniqueIndex('players_username_unique').on(t.usernameKey)]);
export const requests=sqliteTable('friend_requests',{
 id:text('id').primaryKey(),fromId:text('from_id').notNull().references(()=>players.userId),toId:text('to_id').notNull().references(()=>players.userId),status:text('status').notNull().default('pending'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[uniqueIndex('friend_request_pair').on(t.fromId,t.toId),index('friend_requests_incoming').on(t.toId,t.status)]);
export const friendships=sqliteTable('friendships',{
 id:text('id').primaryKey(),lowId:text('low_id').notNull().references(()=>players.userId),highId:text('high_id').notNull().references(()=>players.userId),createdAt:integer('created_at').notNull()
},t=>[uniqueIndex('friendship_pair').on(t.lowId,t.highId),index('friendship_high').on(t.highId)]);
export const matches=sqliteTable('matches',{
 id:text('id').primaryKey(),hostId:text('host_id').notNull().references(()=>players.userId),guestId:text('guest_id').notNull().references(()=>players.userId),mode:text('mode').notNull(),status:text('status').notNull().default('invited'),data:text('data').notNull(),version:integer('version').notNull().default(0),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('matches_host_status').on(t.hostId,t.status),index('matches_guest_status').on(t.guestId,t.status)]);

export const gameSessions=sqliteTable('game_sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>players.userId),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull()},t=>[index('sessions_user').on(t.userId),index('sessions_expiry').on(t.expiresAt)]);
