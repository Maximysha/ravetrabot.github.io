from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.types import Message, CallbackQuery


reg = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='🎲 Получить сигнал', callback_data='getsygnal')],
    [InlineKeyboardButton(text='🔎 Инструкция', callback_data='manual'), InlineKeyboardButton(text='🤖 О боте', callback_data='info')]
])

regget = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Регистрация', url='https://1warlo.top/casino/list/4?p=by17')],
    [InlineKeyboardButton(text='❌ Назад ', callback_data='back')]
])

manual = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='💚 Регистрация', url='https://1warlo.top/casino/list/4?p=by17')],
    [InlineKeyboardButton(text='❌ Назад ', callback_data='back')]
])

info = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='📨 Написать администратору', url='https://t.me/Maximysha')],
    [InlineKeyboardButton(text='❌ Назад ', callback_data='back')]
])

app = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='💣 Получить сигнал', web_app=WebAppInfo(url='https://ravetrabot.github.io/'))],
    [InlineKeyboardButton(text='❌ В главное меню ', callback_data='back')]
])
