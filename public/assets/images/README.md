# Происхождение и обработка изображений

Эта папка содержит две явно разделённые группы: технически восстановленные
legacy-файлы из истории репозитория и WebP derivatives фотографий из публичной
папки Yandex Disk, которую заказчик передал для redesign. Новые изображения не
генерировались, отсутствующие части данных не дорисовывались, watermark не
удалялся.

Права на все публикационные файлы остаются в статусе
`client-provided-pending-final-rights-check`. Этот технический журнал не
заменяет проверку правообладателя, credit и согласий изображённых лиц. Полный
реестр ограничений находится в `docs/ASSET-LICENSES.md`.

## Фотографии «Посвящение в профессию»

Источник: `https://disk.yandex.ru/d/0grsoeDxm9nDbQ`, публичная папка,
предоставленная заказчиком. В репозитории сохранены responsive WebP derivatives
доступных Yandex preview, а не оригинальные JPEG в исходном качестве:

- `initiation-001-portrait*.webp`, `initiation-001-square*.webp`;
- `initiation-014-portrait*.webp`;
- `initiation-015-landscape*.webp`;
- `initiation-034-portrait*.webp`;
- `initiation-039-portrait*.webp`;
- `initiation-043-landscape*.webp`;
- `initiation-052-landscape*.webp`.

Число в имени соответствует исходному имени фотографии в папке. Суффиксы
`-320` и `-480` обозначают уменьшенные варианты. `initiation-001-square*` —
квадратные производные для редакционной сетки. Автор фотографии и юридическое
основание публикации в источнике не указаны; подпись «Архив БРХК» не означает
имя фотографа или подтверждённого правообладателя.

## `brhk-logo.png`

- Исходник: `assets/brhk-logo.png`.
- SHA-256 исходника:
  `6cdc243f5ae5047632dc645a6497f142ac2e0d6fdd61a6a39942a806925a3071`.
- Исходный PNG имеет размер 280 x 150, валидные `IHDR`, `PLTE` и `tRNS`, но
  повреждённый `IDAT`: CRC не совпадает, а строгий zlib-декодер отклоняет поток.
- Chromium 151 полностью отображает исходник. Отображённые RGBA-пиксели были
  сохранены через Canvas в новый валидный PNG без изменения размеров.
- SHA-256 восстановленного файла:
  `edef30c27c5e707de4a00604ff8474c930889bee1029643f7c3ee00c44b9eecd`.
- SHA-256 массива отображённых RGBA-пикселей исходника и восстановленного файла
  одинаков:
  `fab09e5a1655c09daae8c7b602177458eb114a7b89a00e8404bdddc9bcedc745`.

Файл не является побайтовой копией исходного PNG: повреждённое палитровое
сжатие заменено корректным RGBA-сжатием. Он сохраняет пиксели и прозрачность,
которые браузер отображает из исходника.

## `brhk-logo-full.png`

- Исходник передан заказчиком 2 сентября 2026 года как готовый прозрачный PNG 1705 x 677.
- Файл скопирован в репозиторий побайтово, без генеративной обработки, обрезки, изменения цвета или пропорций.
- SHA-256 исходника и файла в репозитории: `def5b0dfc87068369a21a6adb82bb999f57eb6a49f14e7d36336e2ce9ae22866`.
- Файл используется как единый визуальный asset header/footer; юридический статус требует подтверждения заказчиком.

## `studio-tutu.webp`

- Исходник: `assets/studio.b64`.
- SHA-256 исходника:
  `123af9b05df11c65879caf11dd3e236a4af17c380d61255a1bc3166107699ea9`.
- В Base64 был один лишний завершающий знак `=`. Удалён только этот знак,
  после чего строка строго декодирована.
- Полученный WebP не перекодировался: это исходный сжатый payload размером
  10 262 байта, соответствующий длине в RIFF-заголовке.
- Размер изображения: 480 x 720.
- SHA-256 восстановленного файла:
  `197f917e9d84be3d024d512f8f77d61aa32b30c4748500fbda3d2dc206d2b546`.

## Производные от `studio-tutu.webp`

Все варианты ниже получены только из восстановленного `studio-tutu.webp` с
SHA-256
`197f917e9d84be3d024d512f8f77d61aa32b30c4748500fbda3d2dc206d2b546`.
Ретушь, генеративное заполнение и изменение содержимого не применялись.

Квадрат — центральный crop: `x = 0`, `y = (720 - 480) / 2 = 120`.
Горизонтальный вариант — центральный crop: `x = 0`,
`y = (720 - 320) / 2 = 200`. Высота горизонтального варианта шириной 320
округляется до 213 пикселей, чтобы сохранить исходное соотношение сторон с
точностью до целого пикселя.

Точные команды FFmpeg 8.1, выполненные из этой папки:

```text
ffmpeg -y -v error -i studio-tutu.webp -vf "scale=320:-2:flags=lanczos" -frames:v 1 -an -c:v libwebp -preset photo -q:v 82 -compression_level 6 -threads 1 -map_metadata -1 -fflags +bitexact -flags:v +bitexact studio-tutu-320.webp
ffmpeg -y -v error -i studio-tutu.webp -vf "crop=480:480:0:(ih-480)/2" -frames:v 1 -an -c:v libwebp -preset photo -q:v 82 -compression_level 6 -threads 1 -map_metadata -1 -fflags +bitexact -flags:v +bitexact studio-tutu-square.webp
ffmpeg -y -v error -i studio-tutu.webp -vf "crop=480:480:0:(ih-480)/2,scale=320:320:flags=lanczos" -frames:v 1 -an -c:v libwebp -preset photo -q:v 82 -compression_level 6 -threads 1 -map_metadata -1 -fflags +bitexact -flags:v +bitexact studio-tutu-square-320.webp
ffmpeg -y -v error -i studio-tutu.webp -vf "crop=480:320:0:(ih-320)/2" -frames:v 1 -an -c:v libwebp -preset photo -q:v 82 -compression_level 6 -threads 1 -map_metadata -1 -fflags +bitexact -flags:v +bitexact studio-tutu-landscape.webp
ffmpeg -y -v error -i studio-tutu.webp -vf "crop=480:320:0:(ih-320)/2,scale=320:-1:flags=lanczos" -frames:v 1 -an -c:v libwebp -preset photo -q:v 82 -compression_level 6 -threads 1 -map_metadata -1 -fflags +bitexact -flags:v +bitexact studio-tutu-landscape-320.webp
```

| Файл | Размер | SHA-256 |
| --- | ---: | --- |
| `studio-tutu-320.webp` | 320 x 480 | `4a762341245948ff66f4e27400f267e2f26db5564a035e4cb60f78827ef23201` |
| `studio-tutu-square.webp` | 480 x 480 | `2eb049d2f1ec4ef8ecfbf16a1adb12007569cc48f4c476534cec916ed7e5a66e` |
| `studio-tutu-square-320.webp` | 320 x 320 | `d3d2eccc34b695a29b71c0cb6e1cc64cfaf93b3b8eb1f76e83c66f5ef874a03f` |
| `studio-tutu-landscape.webp` | 480 x 320 | `acdf3109d374fd4791b5badda99d642a9f2f11ab6abc900a2b6e6ba84f9fca88` |
| `studio-tutu-landscape-320.webp` | 320 x 213 | `0499fdd2df32ab73fd984c5efd9be25dde35db668247e892850ebb92aee1df25` |

## Иконки из официального логотипа

Иконки получены только из `brhk-logo.png` с SHA-256
`edef30c27c5e707de4a00604ff8474c930889bee1029643f7c3ee00c44b9eecd`.
Весь логотип вписан в квадрат с сохранением пропорций и центрирован на
прозрачном холсте; обрезка и новый фон не применялись.

Команда выполняется из `public/assets/images`; `SIZE` и `NAME` заменяются
значениями из таблицы. Результат записывается в соседнюю папку
`public/assets/icons`:

```text
ffmpeg -y -v error -i brhk-logo.png -vf "scale=SIZE:SIZE:force_original_aspect_ratio=decrease:flags=lanczos,pad=SIZE:SIZE:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba" -frames:v 1 -c:v png -compression_level 9 -pred mixed -threads 1 -map_metadata -1 -fflags +bitexact -flags:v +bitexact ../icons/NAME
```

| `SIZE` | `NAME` | SHA-256 |
| ---: | --- | --- |
| 32 | `../icons/favicon-32.png` | `66b37ba009d3997d701be1e4afc993263d499c33bf103788dd6c074a30796bee` |
| 180 | `../icons/apple-touch-icon.png` | `7b959c757e82f523726fae4a91b9a0098f0ad7978c4fcdeb03449e03afe45076` |
| 192 | `../icons/icon-192.png` | `8c8c2dd20a248a185d3d8e16c0f47164b11aaca8421329c5c831a66c14441173` |
| 512 | `../icons/icon-512.png` | `a2d051549b2c74783ef8c0ce8cb68f95e436583650365f9f560c142b5d9cddaa` |

## Почему нет `stage-gala.webp`

`assets/stage.b64` безопасно восстановить нельзя.

- SHA-256 исходника:
  `c4d15734efbfb0684ffc112c53d443e834a7b24e59c97fa07864d8309ee6fdc0`.
- RIFF-заголовок объявляет 17 266 байт, но Base64 содержит только 13 969 байт:
  отсутствуют 3 297 байт относительно объявленной длины.
- Последние 8 630 Base64-символов побайтово совпадают с хвостом
  `studio.b64`. Это указывает на склейку исходников и не позволяет считать
  этот хвост достоверными данными фотографии сцены.
- Исправление только полей длины позволяет декодеру открыть файл как
  800 x 533, но результат содержит крупные цветные артефакты и сплошную зелёную
  область. Такой файл не является восстановленным изображением и не публикуется.

## Проверка

Все перечисленные опубликованные файлы успешно прошли полное чтение через
FFmpeg 8.1 и Chromium 151. Повторный запуск приведённых команд дал те же
SHA-256. В репозитории нет сведений об авторе, лицензии, дате съёмки или иных
правах на исходные изображения; этот файл таких сведений не предполагает.
