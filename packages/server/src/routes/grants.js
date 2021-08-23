const express = require('express');

const router = express.Router();
const db = require('../db');
const pdf = require('../lib/pdf');

router.get('/', async (req, res) => {
    let agencyCriteria;
    // if we want interested or assigned grants for a user, do not filter by eligibility or keywords
    if (!req.query.interestedByMe || !req.query.assignedToMe) {
        agencyCriteria = await db.getAgencyCriteriaForUserId(req.signedCookies.userId);
    }
    const grants = await db.getGrants({
        ...req.query,
        filters: {
            agencyCriteria,
            interestedByUser: req.query.interestedByMe ? req.signedCookies.userId : null,
            assignedToUser: req.query.assignedToMe ? req.signedCookies.userId : null,
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

router.get('/:grantId/assign', async (req, res) => {
    // const user = await db.getUser(req.signedCookies.userId);
    const { grantId } = req.params;
    const response = await db.getGrantAssignedUsers({ grantId });
    res.json(response);
});

router.put('/:grantId/assign', async (req, res) => {
    const user = await db.getUser(req.signedCookies.userId);
    const { grantId } = req.params;
    const { userIds } = req.body;
    await db.assignGrantsToUsers({ grantId, userIds, userId: user.id });
    res.json({});
});

router.delete('/:grantId/assign', async (req, res) => {
    const user = await db.getUser(req.signedCookies.userId);
    const { grantId } = req.params;
    const { userIds } = req.body;
    await db.unassignUsersToGrant({ grantId, userIds, userId: user.id });
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
    const interestedAgencies = await db.getInterestedAgencies({ grantIds: [grantId] });
    res.json(interestedAgencies);
});

router.get('/:grantId/activity', async (req, res) => {
    const { grantId } = req.params;
    const response = await db.getGrantActivity({ grantId });
    res.json(response);
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
