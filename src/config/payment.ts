export const payment = {
    oneSatoshi: 0.00000001,
    bitaps: {
        // в сатоши
        comisson: {
            replenish: 7200,
            withdraw:  {
                firstUser: 60000,
                additionalUser: 1000,
            },
        }
    },
    commissions: [
        {
            from: 10,
            to: 49,
            commission: 0.2
        },
        {
            from: 50,
            to: 99,
            commission: 0.1
        },
        {
            from: 100,
            to: Infinity,
            commission: 0.045
        }
    ],
    // в USD
    min: {
        replenish: 10,
        withdraw: 10,
    }
};
