import aiogram
import asyncio
from aiogram import Bot, Dispatcher
from app.handlers import router1


async def main():
    bot = Bot(token='7743786584:AAEQKpXN4rj4-X5-HGK49l2j2XZJEUT6hHU')
    dp = Dispatcher()
    dp.include_router(router1)
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Bye Bye')
