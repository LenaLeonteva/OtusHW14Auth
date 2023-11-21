export const CONFIG= {
    rest:{
        port: +(process.env.API_PORT ?? 8000),
        host: process.env.API_HOST
    },
    db: {
        name: 'users',
        connector: 'postgresql',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user:process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    }
}