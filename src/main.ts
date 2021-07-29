import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: {
        origin: function (origin, callback) {
            callback(null, true)
        },
        allowedHeaders: 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, token',
        methods: "*",
        credentials: true,
        }, });
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(3000);
}
bootstrap();
