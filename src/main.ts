import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const corsConf = {
    origin: function (origin, callback) {
        callback(null, true)
    },
    allowedHeaders: 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, token',
    methods: "*",
    credentials: true,
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors(corsConf);
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(3001);
}
bootstrap();
