# Wardrobe

App per smartphone (Android e iOS) per catalogare il proprio guardaroba, provare gli abbinamenti sulla propria figura (foto reale o manichino su misura) e salvare gli outfit preferiti.

## Funzionalità (Fase 1)

**Armadio**
- Griglia "Il tuo armadio" con foto, nome e categoria di ogni capo
- Filtri per categoria: Tutto, Felpe e Maglioni, Pantaloni, Maglie, Camicie, Canotte, Giacche e Cappotti
- Ricerca nel guardaroba
- Aggiunta di un capo scattando una foto, dalla galleria (mostrata direttamente nel pannello) oppure con "Cerca su Google" (Google Immagini dentro l'app)
- Rimozione automatica dello sfondo, fatta sul telefono
- Nome e categoria prima di "Aggiungi all'armadio"; modifica ed eliminazione di un capo già salvato

**Outfit**
- Figura intera al centro, con i capi successivi e precedenti che si intravedono ai lati
- Scorrimento a destra e a sinistra, separato per parte superiore (maglie, felpe…) e inferiore (pantaloni)
- Tocco su un capo: lo si sposta trascinandolo, lo si ridimensiona pizzicando, oppure con i pulsanti Stringi, Allarga, Accorcia, Allunga e Ripristina
- Pressione prolungata: aggiunge uno strato superiore; ogni strato si può selezionare, cambiare o chiudere con la "X"
- Cuore: salvataggio nei preferiti con nome e occasione (Casual, Elegante, …)
- Lente: cerca un capo nell'armadio e lo fa indossare subito

**Profilo**
- "Ciao {nome}", con il numero di capi e di outfit preferiti
- Tasti rapidi "Aggiungi capo" e "Crea Outfit"
- Avatar: "La tua foto" (con "Cambia foto") oppure "Manichino" (con "Personalizza misure": forma maschile o femminile, altezza, peso, spalle, petto)
- "I tuoi outfit preferiti", con l'anteprima indossata sulla figura scelta in quel momento. Tocca un outfit per riaprirlo, oppure il cuore (o tieni premuto) per rimuoverlo

I dati (capi, outfit, misure) restano solo sul telefono: non servono account né server.

## Tecnologia

- [Expo](https://expo.dev) SDK 58 / React Native, TypeScript
- Expo Router (navigazione), React Native Gesture Handler (gesti)
- zustand + AsyncStorage (dati salvati), expo-file-system (immagini)
- react-native-svg (manichino), react-native-webview ("Cerca su Google")
- Modulo nativo locale `modules/background-remover` per la rimozione dello sfondo:
  - iOS 17+: Vision (`VNGenerateForegroundInstanceMaskRequest`)
  - Android: ML Kit Subject Segmentation

## Struttura

```
src/app/                 schermate (Expo Router)
  (tabs)/index.tsx       Il tuo armadio
  (tabs)/outfit.tsx      Crea il tuo outfit
  (tabs)/profile.tsx     Profilo
  add-item.tsx           Aggiungi / modifica un capo
  web-search.tsx         Cerca su Google
  garment-search.tsx     Cerca un capo da indossare
  save-outfit.tsx        Salva nei preferiti
  mannequin.tsx          Personalizza misure
  settings.tsx, welcome.tsx
src/components/          Figura, Manichino, Barra di navigazione, pulsanti, cursori
src/lib/                 geometria del corpo, immagini, rimozione sfondo
src/store/               dati dell'app (zustand)
modules/background-remover/  modulo nativo iOS/Android
```

## Provare l'app

### 1. Subito, con Expo Go (senza rimozione dello sfondo)

```bash
npm install
npx expo start
```

Inquadra il QR code con l'app **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)). Tutto funziona tranne la rimozione dello sfondo, che richiede il modulo nativo: in Expo Go le foto vengono salvate senza scontorno. Su Android, Expo Go potrebbe anche non mostrare la galleria dentro il pannello; in quel caso usa "Apri galleria".

### 2. Versione installabile completa (con rimozione dello sfondo)

Serve un account gratuito su [expo.dev](https://expo.dev).

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview   # APK da installare sul telefono
npx eas-cli@latest build -p ios --profile preview       # richiede un account Apple Developer
```

### Controlli

```bash
npx tsc --noEmit   # tipi
npx expo lint      # lint
```

## Limiti noti e prossimi passi

- La prova è "a ritaglio": il capo scontornato viene appoggiato sulla figura e si sistema a mano. Non è una prova fotorealistica con pieghe e volumi, che richiederebbe una prova virtuale con intelligenza artificiale su server (possibile Fase 3).
- Il manichino è una sagoma 2D proporzionata alle misure, non un modello 3D.
- Sulla foto reale i capi vengono posizionati in base alle misure del manichino; il riconoscimento automatico di spalle e fianchi nella foto è un passo successivo.
- Il modulo nativo per la rimozione dello sfondo non è ancora stato compilato né provato su un dispositivo reale.
- In programma: gomma manuale per ritoccare lo scontorno e servizio di ricerca immagini con risultati dentro l'app.
