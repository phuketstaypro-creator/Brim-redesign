# Источники и статус медиаправ

Этот реестр описывает фактическое происхождение опубликованных assets и известные ограничения. Он не является лицензией, согласием модели или юридическим заключением.

## Как читается статус

Текущие content records используют:

```text
client-provided-pending-final-rights-check
```

Это означает: материал или ссылка на него предоставлены заказчиком для работы над redesign, но окончательное основание публичной публикации, обязательный credit и согласия изображённых лиц ещё не подтверждены. Наличие файла в Git/Vercel не меняет этот статус.

Перед production владелец контента должен зафиксировать:

- правообладателя и основание использования;
- имя фотографа/автора и требуемую форму credit, если применимо;
- согласия изображённых лиц и законных представителей несовершеннолетних, если применимо;
- разрешённые территории, срок, способы использования и crops;
- владельца решения и дату проверки.

До получения данных нельзя придумывать имя автора, удалять watermark или заменять pending status на `owned`/`licensed`.

Build допускает такие records только для review-сборки с `ALLOW_INDEXING=false`. При `ALLOW_INDEXING=true` любой статус, кроме `owned`, `licensed` или `public-domain`, останавливает сборку до явного решения владельца контента.

## Фотографии из Yandex Disk

Источник, записанный в `src/data/media.mjs`:

```text
https://disk.yandex.ru/d/0grsoeDxm9nDbQ
```

Это публичная папка, предоставленная заказчиком. Из доступных preview JPEG подготовлены WebP derivatives. В записи используется подпись `Архив БРХК`, но она обозначает предоставленный архив, не фотографа и не правообладателя. Имя фотографа источник не сообщил; в проекте оно намеренно отсутствует.

| Исходное имя, указанное в media record | Опубликованные derivatives | Media ID / использование |
|---|---|---|
| `20251022 БРХК Посвящение в профессию — 001.jpg` | `initiation-001-portrait*.webp`, `initiation-001-square*.webp` | `initiation001Portrait`, `initiation001Square` |
| `20251022 БРХК Посвящение в профессию — 014.jpg` | `initiation-014-portrait*.webp` | `initiation014Portrait`; mobile crop `stageHero` |
| `20251022 БРХК Посвящение в профессию — 015.jpg` | `initiation-015-landscape*.webp` | desktop `stageHero`; alias `stage` |
| `20251022 БРХК Посвящение в профессию — 034.jpg` | `initiation-034-portrait*.webp` | `initiation034Portrait` |
| `20251022 БРХК Посвящение в профессию — 039.jpg` | `initiation-039-portrait*.webp` | `initiation039Portrait` |
| `20251022 БРХК Посвящение в профессию — 043.jpg` | `initiation-043-landscape*.webp` | `initiation043Landscape` |
| `20251022 БРХК Посвящение в профессию — 052.jpg` | `initiation-052-landscape*.webp` | `initiation052Landscape` |

Для всех строк:

- `rightsStatus`: `client-provided-pending-final-rights-check`;
- `credit`: `Архив БРХК` (не имя автора);
- originals в исходном качестве не сохранены в этом репозитории;
- опубликованы WebP derivatives из Yandex preview;
- final rights/consent check обязателен до официального запуска.

`coverCaption` локальных news records (`Архив БРХК · «Посвящение в профессию», 2025`) описывает архив/мероприятие и не устанавливает авторство фотографии. Связь изображения с конкретной новостью является редакционным оформлением redesign и должна быть отдельно подтверждена колледжем; это не доказательство, что кадр сделан на событии из заголовка новости.

## `studio-tutu.webp` и variants

`studio-tutu.webp` технически восстановлен из исторического `assets/studio.b64`: удалён только лишний завершающий Base64 marker, сжатый WebP payload не перекодирован. Portrait, square и landscape variants — детерминированные resize/crops этого файла.

| Файлы | Media IDs |
|---|---|
| `studio-tutu.webp`, `studio-tutu-320.webp` | `studioPortrait`; alias `studio` |
| `studio-tutu-landscape.webp`, `studio-tutu-landscape-320.webp` | `studioLandscape` |
| `studio-tutu-square.webp`, `studio-tutu-square-320.webp` | `studioSquare` |

Repository provenance доказывает технический источник bytes, но не upstream photographer, license или consent. В `src/data/media.mjs` эти records также имеют `client-provided-pending-final-rights-check` и `Архив БРХК`. Их право публикации требует отдельного подтверждения.

Повреждённый `assets/stage.b64` содержит недостающие/склеенные данные и достоверно не восстанавливается. Он не является публикационным asset и не должен возвращаться в сборку.

## Официальный логотип и icons

`public/assets/images/brhk-logo-full.png` — переданный заказчиком полный бело-красный логотип БРХК. PNG сохранён побайтово без перерисовки, обрезки или перекрашивания и используется в header/footer без изменения пропорций.

`public/assets/images/brhk-logo.png` — прежний официальный файл БРХК, технически пересохранённый из повреждённого PNG через фактически отображённые Chromium pixels без изменения размеров/визуального содержимого. Из него ранее детерминированно подготовлены:

- `public/assets/icons/favicon-32.png`;
- `public/assets/icons/apple-touch-icon.png`;
- `public/assets/icons/icon-192.png`;
- `public/assets/icons/icon-512.png`.

Новый полный логотип используется в header/footer, прежний файл — в уже выпущенных favicon/manifest icons. Media record не содержит имени автора или отдельного лицензионного документа; статус остаётся `client-provided-pending-final-rights-check`. Перед передачей production домена колледж должен подтвердить допустимость использования обоих файлов и производных icon sizes.

Технические SHA-256 и способ восстановления logo/studio перечислены в `public/assets/images/README.md`. Этот технический журнал не заменяет настоящий rights register.

## Build-time materialization и публичные метаданные

Все records из `media` проверяются и копируются на build в:

```text
dist/assets/media/<media-id>-<rendition>.<12-char-sha256>.<ext>
```

HTML получает только first-party `src/srcset`; внешний Yandex URL не загружается браузером. Original files из `public/` также копируются в `dist/`, поэтому deploy artifact нужно считать публикационным набором и проверять целиком.

`dist/content-manifest.json` публикует для каждого asset `id`, materialized URL, размеры, обобщённый `provenance` (`repository` или `external`), `originalName`, `credit` и `rightsStatus`. Точный `source` URL в manifest намеренно не попадает. Поэтому:

- всё равно не помещайте токен в `source` входного bundle или migration logs;
- не добавляйте непубличное имя автора в `originalName`/`credit` без согласованного режима публикации;
- считайте manifest частью публичной поверхности;
- точные source URL, checksums и непубличный provenance храните во внешнем migration register с контролем доступа.

## Правило замены или добавления файла

1. Получить original и зафиксировать checksum.
2. Записать source/originalName/author/rights/consent, не смешивая неизвестное с пустой лицензией.
3. Подготовить renditions без генеративного дополнения и без удаления watermark, если иное не утверждено.
4. Проверить intrinsic dimensions, MIME и декодирование.
5. Обновить `MediaAsset` и содержательный alt/caption.
6. Запустить contract/build/e2e/a11y/visual tests.
7. Проверить `content-manifest.json`, HTML `src/srcset` и real deployed HTTP.
8. Зафиксировать решение владельца контента.

Не подставляйте чужой cover вместо отсутствующего: optional media должен оставаться `null`, а карточка — использовать предусмотренный no-media layout.
