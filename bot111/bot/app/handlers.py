import os
import sqlite3
from aiogram import F, Router, Bot
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, Command
from aiogram.fsm.state import StatesGroup, State
from aiogram.fsm.context import FSMContext
import app.keyboards as kb
from aiogram.types import FSInputFile

router1 = Router()

# Database setup
def setup_database():
    conn = sqlite3.connect('user_ids.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

setup_database()

# Define states
class RegistrationStates(StatesGroup):
    waiting_for_id = State()
    regvalid = State()

global valid
valid = 0

# State for storing user_id
@router1.message(CommandStart())
async def start(message: Message):
    with open('font.jpg', 'rb') as photo:
            await message.answer_photo(FSInputFile('font.jpg'),
                caption='<b>💚 Приветствую тебя, я - бот, созданный командой <u>WIN SYGNAL</u></b>💚\n\nЯ был создан для того. чтобы предсказывать сигналы, подробнее обо мне ты можешь узнать, нажав на кнопку снизу "🤖 О боте".\n\nЕсли же ты хочешь сразу испытать меня, то нажми на кнопку "🎲 Получить сигнал", и ты узнаешь, что я могу.\n\nНо если ты не понимаешь, что нужно делать и как начать получать сигналы, то просто прочитай инструкцию, нажав на кнопку "🔎 Инструкция"',
                parse_mode='html',
                reply_markup=kb.reg
            )
    

@router1.callback_query(F.data == 'getsygnal')
async def manual(callback: CallbackQuery, state: FSMContext):
    with open('manual.jpg', 'rb') as photo2:
        await callback.message.answer(
            '<b>👌 Итак, для начала давай пройдем простую регестрацию в системе! Не пугайся, тут ничего сложного!</b>\n\n'
            'Вкратце скажу, что тебе нужно сделать: тебе нужно нажать на кнопку "Регистрация" и зарегистрировать аккаунт на сайте 1win (<I>это тот самый сайт с игрой, на которую я даю сигналы</I>).\n'
            'После регистрации тебе нужно скинуть ID своего аккаунта прямо мне! Если всё верно - я дам знать.\n\n'
            'А если ты уже был зарегестрирован до моего обновления, то просто скинь тот айди, который я уже валидировал.',
            parse_mode='html',
            reply_markup=kb.regget
            )
        await callback.message.delete()
    await state.set_state(RegistrationStates.waiting_for_id)


@router1.callback_query(F.data == 'back')
async def start(callback: CallbackQuery):
    with open('font.jpg', 'rb') as photo:
            await callback.message.answer_photo(FSInputFile('font.jpg'),
                caption='<b>💚 Приветствую тебя, я - бот, созданный командой <u>WIN SYGNAL</u></b>💚\n\nЯ был создан для того. чтобы предсказывать сигналы, подробнее обо мне ты можешь узнать, нажав на кнопку снизу "🤖 О боте".\n\nЕсли же ты хочешь сразу испытать меня, то нажми на кнопку "🎲 Получить сигнал", и ты узнаешь, что я могу.\n\nНо если ты не понимаешь, что нужно делать и как начать получать сигналы, то просто прочитай инструкцию, нажав на кнопку "🔎 Инструкция"',
                parse_mode='html',
                reply_markup=kb.reg
        )
            await callback.message.delete()                   

@router1.callback_query(F.data == 'manual')
async def manual(callback: CallbackQuery):
    with open('manual.jpg', 'rb') as photo2:
        await callback.message.answer_photo(FSInputFile('manual.jpg'), 
            caption='<b>Как зарегистрироваться в боте?</b>\n\n1. Вам необходимо зарегистрировать <b>НОВЫЙ</b> аккаунт на 1win, используя кнопку "Регистрация" снизу. Именно так наш бот привяжет вас к базе и будет выдавать сигналы, проходимостью 96%!\n\n2. После того, как вы зарегистрировали аккаунт, вам <b>НЕОБХОДИМО</b> пополнить ваш игровой баланс на сайте <b>1win</b>. Рекомендуемая сумма - от <u>3.000 рублей</u>, потому что именно при пополнении от этой<b> суммы</b> сигналы будут <b>максимально</b> точные! \n\n3. Вам нужно скопировать ваш <b>ID</b> только что зарегистрированного аккаунта и отправить его в <b>диалог с ботом</b>.\nПодробнее о том, как получить айди написано тут - @wsinstr\n\nПосле выполнения всех этих шагов вам откроется веб-приложение, в котором вы и будете получать сигналы.',
            parse_mode='html',
            reply_markup=kb.manual
            )
        await callback.message.delete()

@router1.callback_query(F.data == 'info')
async def info(callback: CallbackQuery):
    await callback.message.answer(
        '💚 <b>Спасибо, что интересуешься мной! Вот, что обо мне написали мои создатели:</b>\n\n'
        '<I>🧬 Этого бота разрабатывала команда WINSYGNAL на протяжении 4-ёх месяцев</I>\n\n<I>🧬 Бот выдаёт сигналы, опираясь на машинное обучение и 2-e нейросети - <U>Midjourney</U> и <U>TensorFlow</U>.</I>'
        '\n\n<b>Как работает "<I>Машинное обучение?</I>". В бота на протяжении 3-ёх месяцев загружались коомбинации игры MINES. Всего коомбинаций, которых анализировал бот ~ 117.000. На основе этих данных бот прогнозирует следующий сигнал!</b>\n\n'
        '📊 <b>На данный момент точность бота состовляет </b>- <I>95%</I>',
        parse_mode='html',
        reply_markup=kb.info
        )
    await callback.message.delete()



@router1.message(Command('getid'))
async def get_id(message: Message):
    # Extract the user ID from the message
    user_id = message.text.split(' ', 1)
    if len(user_id) > 1:
        user_id_value = user_id[1]
        # Save to the database
        conn = sqlite3.connect('user_ids.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO users (user_id) VALUES (?)', (user_id_value,))
        conn.commit()
        conn.close()
        await message.answer(f'✅ Ваш ID {user_id_value} успешно сохранён в базе данных!')
    else:
        await message.answer('❗️ Пожалуйста, укажите ваш ID после команды')

@router1.message(RegistrationStates.waiting_for_id)
async def process_id_input(message: Message, state: FSMContext):
    user_id_value = message.text.strip()
    
    # Check if the input is numeric
    if not user_id_value.isdigit():
        await message.answer('❗️ О нет, кажетсяБ ты пытаешься меня обмануть! Введи свой настоящий ID:')
        return

    # Check if the ID exists in the database
    conn = sqlite3.connect('user_ids.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id_value,))
    result = cursor.fetchone()
    conn.close()

    if result:
        # User is registered
        await message.answer(f'<b>🔥 Отлично, молодец! \n\n🔑 Твой аккаунт: <I>{user_id_value}</I> я уже валидировал в системе. \n\nТеперь я готов дать тебе сигнал! нажимай на кнопку снизу 👇🏻</b>', parse_mode='html', reply_markup=kb.app)
        await state.clear()  # Clear the state
        valid = 0
    else:
        await message.answer('❗️ Кажется ты сделал что-то не так, попробуй ещё раз через 5 минут или обратись к моему создателю - @grad_money')

@router1.message(Command('getlink'))
async def update_link(message: Message):
    # Извлекаем новую ссылку из сообщения
    new_link = message.text.split(' ', 1)
    
    if len(new_link) > 1:
        new_link_value = new_link[1] 
        
        # Обновляем инлайн клавиатуру
        kb.reg.inline_keyboard[0][0].url = new_link_value
        
        await message.answer('✅ Ссылка успешно обновлена!')
    else:
        await message.answer('❗️ Пожалуйста, укажите новую ссылку после команды')