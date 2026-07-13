// IMPORTANT: this must be the very first require in the entry file,
// before express-based routes are set up, so async route errors reach errorHandler.
require('express-async-errors');

const express = require('express');
const logger = require('./Services/logger');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const clientErrorsRoute = require('./routes/clientErrors');

const app = express();

app.use(express.json());
app.use(requestId);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/client-errors', clientErrorsRoute);

// --- register your other app routes here ---

// Error handler must be the LAST app.use() call, after every route above.
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled rejection', reason });
});
process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception', stack: err.stack });
  process.exit(1); // let PM2 restart cleanly
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  logger.info({ message: `Server listening on port ${PORT}` })
);
