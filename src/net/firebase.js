import { firebaseConfig } from './firebase-config.js';

const CDN = 'https://www.gstatic.com/firebasejs/10.12.2';

/** 失敗しても例外を投げず null を返す。呼び出し側は1人プレイにフォールバックする。 */
export async function initFirebase() {
  try {
    const [{ initializeApp }, { getAuth, signInAnonymously }, dbMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-auth.js`),
      import(`${CDN}/firebase-database.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    const cred = await signInAnonymously(getAuth(app));
    return { db: dbMod.getDatabase(app), uid: cred.user.uid, api: dbMod };
  } catch (err) {
    console.warn('Firebase 初期化に失敗。1人プレイで続行します。', err);
    return null;
  }
}
