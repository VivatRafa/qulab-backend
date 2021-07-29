export const deposite = {
    tariffs: {
        1: {
            id: 1,
            name: 'junior',
            amount: {
                from: 100,
                until: 1000,
            },
            percent: 0.011,
        },
        2: {
            id: 2,
            name: 'middle',
            amount: {
                from: 1001,
                until: 5000,
            },
            percent: 0.0132,
        },
        3: {
            id: 3,
            name: 'senior',
            amount: {
                from: 5001,
                until: 9999999,
            },
            percent: 0.0158,
        }
    }
};
