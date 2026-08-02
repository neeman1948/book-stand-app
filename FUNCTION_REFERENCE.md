# מפת פונקציות - app.js

הקובץ הזה מחליף “הערות על כל שורה” בצורה יותר נקייה: הוא מסביר מה כל קבוצת פונקציות עושה, כדי שאפשר יהיה להמשיך לפתח בלי לנחש.

## יצירת מזהים והגדרות ברירת מחדל

- `newId` - יוצר מזהה ייחודי לספר, מבצע, הזמנה או גיבוי.
- `cloneDefaultSettings` - משכפל את הגדרות ברירת המחדל בלי לשנות את המקור.

## הודעות ושגיאות

- `showToast` - מציג הודעה קצרה למשתמש בתחתית המסך.
- `handleAppError` - שומר שגיאה טכנית בקונסול ומציג למשתמש הודעה ברורה בעברית.
- `runSafely` - עוטף פעולה ב-try/catch כדי למנוע קריסה שקטה.

## ניקוי ותקנון נתונים

- `normalizeBarcode` - משאיר רק ספרות בברקוד.
- `money` - מציג מספר כמחיר בשקלים.
- `normalizeBook` - הופך ספר מכל מקור למבנה אחיד של האפליקציה.
- `normalizePromotion` - הופך מבצע למבנה אחיד.
- `normalizeOrder` - הופך הזמנת ספר למבנה אחיד.
- `normalizeCartItem` - הופך פריט סל למבנה אחיד עם מזהה ספר, כמות וזמן הוספה.
- `normalizeInvoice` - הופך חשבונית/קבלה/זיכוי למבנה אחיד.
- `normalizeTraderPrice` - הופך מחיר סוחר למבנה אחיד עם ספר, מחיר רגיל, מחיר חודש הספר ושם סוחר.
- `normalizeSettings` - מאחד הגדרות קיימות, ישנות או חדשות למבנה אחד.

## אחסון וגיבוי

- `saveLocal` - שומר ספרים, הזמנות והגדרות ב-`localStorage`.
- `loadLocal` - טוען נתונים מהדפדפן או יוצר נתוני הדגמה.
- `loadLocalInvoices` - טוען חשבוניות מקומיות גם כאשר שאר הנתונים מגיעים ממסד מרוחק.
- `createDataSnapshot` - יוצר תמונת מצב מלאה של ספרים, הזמנות והגדרות.
- `backupData` - שומר גיבוי פנימי עם חותמת זמן בכל פתיחה.
- `getLocalBackups` - מחזיר את הגיבויים הפנימיים כדי לכלול אותם בייצוא.
- `pushUndoSnapshot` - שומר מצב לפני פעולה שאפשר לבטל.
- `renderUndoState` - מעדכן את כפתור הביטול בניהול.
- `openUndoDialog` - פותח חלון אישור לפני ביטול.
- `restoreLastUndoSnapshot` - מחזיר את הספרים, המכירות, ההזמנות וההגדרות למצב שלפני הפעולה האחרונה.
- `getConfig` - קורא את הגדרות Supabase מתוך `config.js`.

## Supabase וסנכרון

- `initSupabaseIfConfigured` - בודק אם הוגדר Supabase ומתחבר אליו.
- `refreshRemoteData` - מושך ספרים, הזמנות והגדרות מהמסד.
- `remoteSettingsToApp` - ממיר הגדרות מרוחקות למבנה האפליקציה.
- `parseJsonSetting` - קורא ערך JSON מהטבלה בצורה בטוחה.
- `subscribeToRemoteChanges` - מאזין לשינויים בזמן אמת ומרנדר מחדש.
- `bookToRemotePayload` - ממיר ספר ממבנה האפליקציה למבנה השדות של Supabase, כולל תמיכה בספר בלי ברקוד.
- `saleToRemotePayload` - ממיר שורת רכישה למבנה `sales`, כולל כמות וסכום כולל כשיש תמיכה במסד.
- `insertSalesRows` - שומר שורות רכישה ב-Supabase, עם ניסיון תאימות לטבלת `sales` ישנה אם חסרים שדות הסל החדשים.
- `persistBook` - שומר ספר מקומית או ב-Supabase.
- `deleteBook` - מוחק ספר מקומית או מ-Supabase, אחרי אישור מהניהול.
- `persistOrder` - שומר הזמנה מקומית או ב-Supabase.
- `deleteOrder` - מסיר הזמנה אחת לפי מזהה, מקומית או ב-Supabase.
- `persistSettings` - שומר הגדרות עסק, תשלום, אודות ומבצעים.
- `markPurchased` - מוריד יחידה מהמלאי ומתעד מכירה אם יש Supabase.

## חיפוש וסינון

- `findBookByBarcode` - מחפש ספר לפי ברקוד.
- `searchBooks` - מחפש לפי שם, מחבר וקטגוריה. אפשר להפעיל חיפוש ברקוד רק במקומות פנימיים כמו ניהול.
- `getCustomerBrowseBooks` - מחזיר רשימת ספרים לעיון במסך חיפוש הלקוח כששורת החיפוש ריקה.
- `getCartLines` / `getCartTotals` - מחזירים את שורות הסל עם הספרים המעודכנים ואת סיכום הכמות והסכום.
- `addToCart` / `setCartQuantity` / `clearCart` - מנהלים הוספה לסל, שינוי כמות, הסרה וניקוי סל.
- `getVisibleBooks` - מחזיר את הספרים שמוצגים בניהול לפי חיפוש וסידור.
- `getVisibleInvoices` - מחזיר חשבוניות לפי סינון חודש, ספק, סוג מסמך וסטטוס.
- `parseBookImportText` - קורא טקסט CSV/TSV או הדבקה מאקסל ומחזיר ספרים עם שם ומחיר.
- `persistImportedBooks` - מוסיף או מעדכן ספרים שיובאו מקובץ, ושומר לפני כן נקודת ביטול פעולה.
- `setBookImportStatus` - מציג בניהול הספרים הודעת מצב אחרי ייבוא ספרים.
- `detectInvoiceFromFile` / `applyInvoiceDetection` - מנסים לזהות אוטומטית פרטי חשבונית מתוך שם הקובץ ומתוך PDF עם טקסט, וממלאים את הטופס לפני שמירה.
- `importInvoiceFiles` / `saveInvoiceFileWithDetection` - שומרים כמה חשבוניות בבת אחת מבחירה או גרירה, עם זיהוי אוטומטי וסטטוס לבדיקה.
- `normalizeInvoiceText` - מנקה טקסט שחוזר מ-PDF, כולל תיקון סימנים מוזרים במקום האות נ.
- `LEARNED_INVOICE_RULES` / `findLearnedInvoiceRule` - כללים ידניים שנלמדו מחשבוניות אמיתיות, לפי שם קובץ או מספר מסמך.
- `findInvoiceNumber` - מנסה לזהות מספר מסמך מתוך PDF או שם קובץ.
- `findInvoiceDate` - מחפש תאריך מסמך ומנסה להימנע מתאריך תשלום או תאריך משוקלל.
- `findInvoiceAmount` - מחפש סכום לתשלום בלי לקחת יתרה, אחוז מע"מ, מספר חשבון או מספרי מק"ט כסכום.
- `findSupplierFromText` - מזהה ספק מתוך הטקסט, כולל ספקים שמופיעים בתחתית מסמכי חשבשבת/HashDoc.

## ניווט מסכים

- `switchView` - מחליף בין לקוח, אודות וניהול.
- `openAdminAccessDialog` / `unlockAdmin` - פותחים נעילת מנהל ובודקים קוד מנהל לפני כניסה לניהול.
- `openHiddenAdminAccess` / `handleHiddenAdminTap` / `startHiddenAdminLongPress` - מפעילות כניסה נסתרת לניהול דרך שם העסק במסך הלקוח.
- `showCustomerScreen` - פותח מסך פעולה בצד הלקוח.
- `showCustomerHome` - חוזר למסך הבית של הלקוח.
- `goBackCustomerScreen` - מחזיר ממסך מחיר למסך שממנו הגיעו, ובשאר המסכים חוזר לבית.

## רינדור למסך

- `render` - מרנדר את כל אזורי האפליקציה.
- `renderBusiness` - מציג שם עסק ותיאור קצר.
- `renderCartButton` / `renderCart` - מציגים את כפתורי הסל ואת מסך סל הקנייה ללקוח.
- `renderCartCheckoutSummary` - מציג בחלון התשלום את רשימת הספרים, הכמויות והסכום הכולל.
- `activePromotions` - מחזיר רק מבצעים פעילים לפי סדר תצוגה.
- `renderPromos` - מציג מבצעים ללקוח.
- `renderNewBooks` - מציג ספרים שסומנו כחדשים.
- `renderPayment` - מציג Bit, בנק והסברי תשלום.
- `renderAbout` - מציג אודות.
- `renderAdminForms` - ממלא את טפסי הניהול מההגדרות הקיימות.
- `renderBooksTable` - מציג את טבלת ניהול הספרים ומעדכן ספירת ספרים מוצגים מתוך כלל הספרים.
- `renderOrders` - מציג את טבלת בקשות הספרים, כולל הזמנות שנוספו מהניהול, סטטוס הזמנה וסימון שולם/לא שולם.
- `renderInvoices` - מציג סיכום ורשימת חשבוניות לפי הסינון הנוכחי, כולל מסמכים לבדיקה וספקים מרכזיים.
- `renderTraderPriceItem` - יוצר שורה אחת במחירון לפי סוחר.
- `renderTraderBookPriceItem` - יוצר שורה אחת במחירון לפי ספר, שבה הסוחר הוא הכותרת.
- `renderTraderPrices` - מציג את רשימת מחירי הסוחרים, כרטיסי פתיחה לכל סוחר, כרטיסי פתיחה לכל ספר, מחירון ממוקד לסוחר ומחירון ממוקד לספר.
- `renderSuggestions` - מציג השלמות חיפוש.
- `renderSearchResults` - מציג תוצאות חיפוש ללקוח.
- `renderOrderSearchResults` - מציג תוצאות חיפוש לפני בקשה לספר חסר.
- `renderOrderBookCard` - מציג תוצאת ספר במסך בקשה עם כפתור "בקשו שנביא את הספר".
- `renderBookCard` - יוצר כרטיס ספר לרשימות.
- `renderThumb` - מציג תמונת ספר או מקום ריק.
- `renderResult` - מציג את הספר אחרי חיפוש/סריקה, כולל תיאור ללקוח ואזור מחיר נפרד.
- `renderNotFound` - מציג הודעה כשלא נמצא ספר.

## חלונות עריכה ועזרים

- `openBookDialog` - פותח חלון הוספת/עריכת ספר.
- `openDeleteBookDialog` - פותח חלון אישור לפני מחיקת ספר.
- `openPromoDialog` - פותח חלון הוספת/עריכת מבצע.
- `openCartCheckout` - פותח חלון תשלום מרוכז עבור כל הספרים שבסל.
- `openPurchaseConfirm` - תאימות למסלול רכישה ישן: מוסיף ספר יחיד לסל ופותח תשלום.
- `confirmCartPurchase` / `confirmPendingPurchase` - מסמנים רכישה מרוכזת, מורידים מלאי לכל שורת סל ושומרים רכישות.
- `showOrderFormForTitle` - פותח את טופס ההזמנה וממלא את שם הספר שנבחר.
- `openOrderForBook` - מעביר את הלקוח לבקשת ספר קיים וממלא את שם הספר באופן אוטומטי.
- `guessSupplierFromFileName` - מנחש ספק ראשוני מתוך שם קובץ חשבונית.
- `saveInvoiceFromForm` - שומר חשבונית מקובץ שהועלה עם פרטי ספק, תאריך, סוג, סכום והערות.
- `hideSuggestions` - סוגר השלמות חיפוש פתוחות.
- `formatDate` - מציג תאריך בעברית.
- `escapeHtml` - מונע הכנסת HTML לא בטוח לתצוגה.
- `escapeAttr` - מנקה טקסט שמשובץ בתכונות HTML.
- `fileToDataUrl` - קורא תמונה מהמחשב ושומר אותה כטקסט מקומי.

## ברקוד ואירועים

- `handleBarcode` - מטפל בברקוד שנקלט מהמצלמה או מהקלדה.
- `startScanner` - מפעיל את מצלמת הברקוד.
- `stopScanner` - עוצר את מצלמת הברקוד.
- `bindEvents` - מחבר את כל הכפתורים, הטפסים והטבלאות לפונקציות.
- `init` - נקודת ההפעלה הראשית של האפליקציה.

## עדכון ניהול ומכירות

- `normalizeSale` - הופך רכישה למבנה אחיד עבור יומן הרכישות והניתוח.
- `renderSalesInsights` - מציג בניהול סיכום רכישות, הכנסה משוערת, ספרים מובילים ומלאי נמוך.
- `renderBooksTable` מציג עכשיו טבלת ספרים קומפקטית יותר.
- `markPurchased` מוריד מלאי וגם מוסיף רשומה ליומן הרכישות המקומי או לטבלת `sales`.
