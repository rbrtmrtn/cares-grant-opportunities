const express = require('express');

const router = express.Router();
const db = require('../db');
const pdf = require('../lib/pdf');

router.get('/', async (req, res) => {
    const user = await db.getUser(req.signedCookies.userId);
    const eligibilityCodes = await db.getAgencyEligibilityCodes(user.agency.id, { enabled: true });
    const enabledECodes = eligibilityCodes.filter((e) => e.enabled);
    const keywords = await db.getAgencyKeywords(user.agency.id);
    const grants = await db.getGrants({
        ...req.query,
        filters: {
            eligibilityCodes: enabledECodes.map((c) => c.code),
            keywords: keywords.map((c) => c.search_term),
        },
    });
    res.json(grants);
});

router.put('/:grantId/view/:agencyId', async (req, res) => {
    const user = await db.getUser(req.signedCookies.userId);
    const { agencyId, grantId } = req.params;
    await db.markGrantAsViewed({ grantId, agencyId, userId: user.id });
    res.json({});
});

router.get('/:grantId/interested', async (req, res) => {
    const { grantId } = req.params;
    const interestedAgencies = await db.getInterestedAgencies({ grantIds: [grantId] });
    res.json(interestedAgencies);
});

router.put('/:grantId/interested/:agencyId', async (req, res) => {
    const user = await db.getUser(req.signedCookies.userId);
    const { agencyId, grantId } = req.params;
    let interestedCode = null;
    if (req.body && req.body.interestedCode) {
        interestedCode = req.body.interestedCode;
    }
    await db.markGrantAsInterested({
        grantId,
        agencyId,
        userId: user.id,
        interestedCode,
    });
    res.json({});
});

const formFields = {
    nevada_spoc: {
        PDFTextField: {
            'Name of Person Requesting SPoC': 'name',
            Email: 'email',
            'NoFO #': 'grant_number',
            'Title of Federal Program': 'title',
            CFDA: 'cfda_list',
            'Application amount': '',
            'Funding Agency': 'agencyName',
            // 'Date of award or start of project': '',
            // 'Date due': '',
            // 'Date full application is due': '',
            'Max amount allowed for applications': 'award_ceiling',
            // 'State Application Identification #': '',
            // Summary: '',
        },
    },
};

router.get('/:grantId/form/:formName', async (req, res) => {
    if (req.params.formName !== 'nevada_spoc') {
        return res.status(400);
    }
    const user = await db.getUser(req.signedCookies.userId);
    const grant = await db.getGrant({ grantId: req.params.grantId });
    if (!grant) {
        return res.status(404);
    }
    if (grant.raw_body) {
        try {
            const rawBody = JSON.parse(grant.raw_body);
            grant.agencyName = rawBody && rawBody.synopsis ? rawBody.synopsis.agencyName : '';
        } catch (e) {
            console.log('failed to parse grant raw_body');
        }
    }
    const filePath = await pdf.fillPdf(`${req.params.formName}.pdf`, formFields[req.params.formName], {
        ...user,
        ...grant,
    });
    res.json({ filePath: `${process.env.API_DOMAIN}${filePath}` });
});

module.exports = router;
