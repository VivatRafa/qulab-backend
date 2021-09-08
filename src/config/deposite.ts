export const deposite = {
    // USD
    min: 100,
    tariffs: {
        1: {
            id: 1,
            name: 'junior',
            amount: {
                from: 100,
                until: 1000,
            },
            percent: 1.015,
            days: 50, // 91
        },
        2: {
            id: 2,
            name: 'middle',
            amount: {
                from: 1001,
                until: 5000,
            },
            percent: 1.019,
            days: 45 // 76
        },
        3: {
            id: 3,
            name: 'senior',
            amount: {
                from: 5001,
                until: 9999999999999999999999999,
            },
            percent: 1.022,
            days: 45 // 64
        }
    }
};
