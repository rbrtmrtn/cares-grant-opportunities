const agencies = [
    { id: 1, name: 'education agency', parent: null },
    { id: 2, name: 'department of kindergarden', parent: 1 },
    { id: 3, name: 'division of arts', parent: 2 },
    { id: 4, name: 'health agency', parent: null },
];

exports.agencies = agencies;

exports.seed = function (knex) {
    return knex('agencies')
        .del()
        .then(() => knex('agencies').insert(agencies));
};
