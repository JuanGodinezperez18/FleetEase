/**
 * @fileoverview Firebase client-side configuration.
 * This file contains the configuration object needed to initialize the Firebase SDK.
 * It is separated to ensure it's explicitly included in the bundle and not reliant
 * on environment variables that may fail to load during build/runtime.
 *
 * It is safe to expose this configuration on the client-side.
 * Security is enforced by Firebase Security Rules, not by hiding these keys.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBqdnnCZf70rQMLiTx9LIguJqXwCGR11ac",
  authDomain: "fleetease-manager.firebaseapp.com",
  databaseURL: "https://fleetease-manager-default-rtdb.firebaseio.com",
  projectId: "fleetease-manager",
  storageBucket: "fleetease-manager.appspot.com",
  messagingSenderId: "347536268653",
  appId: "1:347536268653:web:2148551b5f76504df40e64",
  measurementId: "G-K1BRZB6JEY"
};
