import { createApp } from './app.js';
import { getConfig } from './config.js';
import { createLogger } from './logger.js';
import { createBotRouter } from './bot/router.js';
import { createConversationService } from './services/conversation.service.js';
import { createLlmService } from './services/llm.service.js';
import { createZaloService } from './services/zalo.service.js';
import { createDatabaseService } from './services/database.service.js';
import { createKnowledgeService } from './services/knowledge.service.js';

const config = getConfig();
const logger = createLogger();
const database = createDatabaseService({ ...config, databaseUrl: config.databaseUrl }, logger);
const knowledge = createKnowledgeService(database);
const conversations = createConversationService(config.dataFile);
const app = createApp({ config, logger, database, knowledge, conversations, botRouter: createBotRouter({ config, logger, conversations, llm: createLlmService(config) }), zalo: createZaloService(config) });
app.listen(config.port, () => logger.info('Zalo bot listening', { port: config.port, environment: config.nodeEnv }));
