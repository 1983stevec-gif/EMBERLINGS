import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const players=sqliteTable('players',{
 userId:text('user_id').primaryKey(),recoveryHash:text('recovery_hash'),username:text('username').notNull(),usernameKey:text('username_key').notNull(),
 petMutation:text('pet_mutation'),petRarity:text('pet_rarity').notNull().default('Common'),petSecret:integer('pet_secret').notNull().default(0),petKind:integer('pet_kind').notNull().default(0),petShiny:integer('pet_shiny').notNull().default(0),title:text('title'),seenAt:integer('seen_at').notNull(),createdAt:integer('created_at').notNull()
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

export const tradeAssets=sqliteTable('trade_assets',{
 id:text('id').primaryKey(),originUserId:text('origin_user_id').notNull().references(()=>players.userId),originLocalId:text('origin_local_id').notNull(),ownerId:text('owner_id').notNull().references(()=>players.userId),data:text('data').notNull(),eligible:integer('eligible').notNull().default(1),lockedTradeId:text('locked_trade_id'),updatedAt:integer('updated_at').notNull()
},t=>[uniqueIndex('trade_assets_origin').on(t.originUserId,t.originLocalId),index('trade_assets_owner').on(t.ownerId),index('trade_assets_lock').on(t.lockedTradeId)]);
export const trades=sqliteTable('trades',{
 id:text('id').primaryKey(),hostId:text('host_id').notNull().references(()=>players.userId),guestId:text('guest_id').notNull().references(()=>players.userId),status:text('status').notNull(),hostOffer:text('host_offer'),guestOffer:text('guest_offer'),hostAccepted:integer('host_accepted').notNull().default(0),guestAccepted:integer('guest_accepted').notNull().default(0),offerRevision:integer('offer_revision').notNull().default(0),version:integer('version').notNull().default(0),changeToken:text('change_token'),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()
},t=>[index('trades_host_status').on(t.hostId,t.status),index('trades_guest_status').on(t.guestId,t.status)]);
export const tradeReceipts=sqliteTable('trade_receipts',{
 id:text('id').primaryKey(),tradeId:text('trade_id').notNull().references(()=>trades.id),userId:text('user_id').notNull().references(()=>players.userId),outgoingAsset:text('outgoing_asset').notNull(),incomingAsset:text('incoming_asset').notNull(),outgoingLocalId:text('outgoing_local_id').notNull(),creature:text('creature').notNull(),acknowledged:integer('acknowledged').notNull().default(0),createdAt:integer('created_at').notNull()
},t=>[uniqueIndex('trade_receipt_player').on(t.tradeId,t.userId),index('trade_receipts_pending').on(t.userId,t.acknowledged)]);
