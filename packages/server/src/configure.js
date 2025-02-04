/* eslint-disable global-require */
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const history = require('connect-history-api-fallback');
const { resolve } = require('path');

const publicPath = resolve(__dirname, '../../client/dist');

module.exports = (app) => {
    app.use(cors({
        credentials: true,
        exposedHeaders: ['set-cookie'],
        origin: (origin, callback) => {
            // if (allowedOrigins.includes(origin)) {
            callback(null, true);
            // } else {
            //     callback(new Error(`Origin: ${origin} is now allowed`));
            // }
        },
    }));
    app.use(morgan('common'));
    app.use(cookieParser(process.env.COOKIE_SECRET));
    app.use(bodyParser.json());
    app.use('/api/users', require('./routes/users'));
    app.use('/api/roles', require('./routes/roles'));
    app.use('/api/sessions', require('./routes/sessions'));
    app.use('/api/agencies', require('./routes/agencies'));
    app.use('/api/grants', require('./routes/grants'));
    app.use('/api/dashboard', require('./routes/dashboard'));
    app.use('/api/eligibility-codes', require('./routes/eligibilityCodes'));
    app.use('/api/interested-codes', require('./routes/interestedCodes'));
    app.use('/api/keywords', require('./routes/keywords'));
    app.use('/api/refresh', require('./routes/refresh'));

    const staticMiddleware = express.static(publicPath, {
        etag: true,
        lastModified: true,
        setHeaders: (res, path) => {
            const hashRegExp = new RegExp('\\.[0-9a-f]{8}\\.');

            if (path.endsWith('.html')) {
                // All of the project's HTML files end in .html
                res.setHeader('Cache-Control', 'no-cache');
            } else if (hashRegExp.test(path)) {
                // If the RegExp matched, then we have a versioned URL.
                res.setHeader('Cache-Control', 'max-age=31536000');
            }
        },
    });
    app.use(staticMiddleware);
    app.use('/static', express.static(`${__dirname}/static`));
    app.use(
        history({
            disableDotRule: true,
            verbose: true,
        }),
    );
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500);
        res.json({ status: 500, message: 'Internal Server Error' });
    });
};
