import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController } from 'ionic-angular';
import { InAppBrowser } from '@ionic-native/in-app-browser';

import { UserDataProvider } from '@providers/user-data/user-data';
import { ArkApiProvider } from '@providers/ark-api/ark-api';
import { ToastProvider } from '@providers/toast/toast';

import { NetworkProvider } from '@providers/network/network';
import { BaseWalletImport } from '@root/src/pages/wallet/wallet-import/wallet-import.base';

import * as constants from '@app/app.constants';

@IonicPage()
@Component({
  selector: 'page-wallet-import-passphrase',
  templateUrl: 'wallet-import-manual.html',
  providers: [InAppBrowser]
})
export class WalletManualImportPage extends BaseWalletImport  {

  public addressOrPassphrase: string;
  public useAddress: boolean;
  public nonBIP39Passphrase: boolean;
  public wordSuggestions = [];
  public hidePassphrase = false;
  public passphraseHidden: string;

  @ViewChild('inputAddressOrPassphrase') inputAddressOrPassphrase;
  @ViewChild('inputPassphraseHidden') inputPassphraseHidden;

  constructor(
    navParams: NavParams,
    navCtrl: NavController,
    userDataProvider: UserDataProvider,
    arkApiProvider: ArkApiProvider,
    toastProvider: ToastProvider,
    modalCtrl: ModalController,
    networkProvider: NetworkProvider,
    private inAppBrowser: InAppBrowser) {
    super(navParams, navCtrl, userDataProvider, arkApiProvider, toastProvider, modalCtrl, networkProvider);
    this.useAddress = navParams.get('type') === 'address';
    this.nonBIP39Passphrase = false;
  }

  submitForm() {
    this.import(this.useAddress ? this.addressOrPassphrase : null,
                this.useAddress ? null : this.addressOrPassphrase,
                !this.nonBIP39Passphrase);
  }

  openBIP39DocURL() {
    return this.inAppBrowser.create(constants.BIP39_DOCUMENTATION_URL, '_system');
  }

  addressOrPassphraseChange(value) {
    const lastAddressOrPassphrase = this.addressOrPassphrase || '';
    this.addressOrPassphrase = value;
    this.updatePassphraseHidden();

    this.suggestWord(lastAddressOrPassphrase, this.addressOrPassphrase);
  }

  passphraseHiddenChange(value) {
    const lastPassphrase = this.addressOrPassphrase;
    const lastPassphraseHidden = this.passphraseHidden || '';

    const lengthDiff = value.length - lastPassphraseHidden.length;
    if (lengthDiff < 0) {
      // we removed characters : make sure we removed the trailing chars
      if (lastPassphraseHidden.slice(0, lengthDiff) === value) {
        this.addressOrPassphrase = this.addressOrPassphrase.slice(0, lengthDiff);
      } else {
        // we removed some chars inside the passphrase : unsupported in the passphrase hidden mode
        // (because if we removed asterisks, we don't know which letter was behind it and can't update the plain passphrase)
        this.toastProvider.error('WALLETS_PAGE.PASSPHRASE_UNSUPPORTED_INPUT');
      }
    } else {
      // we added characters : just check that asterisks are still there and update the non-asterisk part
      const lastAsterisk = lastPassphraseHidden.lastIndexOf('*');
      if (lastPassphraseHidden.slice(0, lastAsterisk + 1) === value.slice(0, lastAsterisk + 1)) {
        this.addressOrPassphrase = this.addressOrPassphrase.slice(0, lastAsterisk + 1) + value.slice(lastAsterisk + 1);
      } else {
        // we added characters inside the asterisks part : unsupported (we wouldn't know how to update the plain passphrase)
        this.toastProvider.error('WALLETS_PAGE.PASSPHRASE_UNSUPPORTED_INPUT');
      }
    }

    this.updatePassphraseHidden();
    this.suggestWord(lastPassphrase, this.addressOrPassphrase);
  }

  updatePassphraseHidden() {
    const wordsPassphrase = this.addressOrPassphrase.split(' ');
    const tmpPassphraseHidden = [];
    wordsPassphrase.forEach((elem, index, arr) => tmpPassphraseHidden.push(index === arr.length - 1 ? elem : '*'.repeat(elem.length)));
    this.passphraseHidden = tmpPassphraseHidden.join(' ');
  }

  showHidePassphrase() {
    this.hidePassphrase = !this.hidePassphrase;
  }

  suggestWord(lastPassphrase, passphrase) {
    this.wordSuggestions = [];

    if (this.useAddress || this.nonBIP39Passphrase) { return; }

    const wordsLastPassphrase = lastPassphrase.split(' ');
    const wordsPassphrase = passphrase.split(' ');
    if (wordsLastPassphrase.length !== wordsPassphrase.length) { return; }
    // don't do anything if we type 1st letter of a new word or if we remove one word

    const lastWordLastPassphrase = wordsLastPassphrase.pop();
    const lastWordPassphrase = wordsPassphrase.pop();
    if (wordsLastPassphrase.join() !== wordsPassphrase.join()) { return; } // we only want the last word to change

    if (Math.abs(lastWordLastPassphrase.length - lastWordPassphrase.length) === 1 && lastWordPassphrase.length > 1 &&
        (lastWordLastPassphrase.indexOf(lastWordPassphrase) !== -1 || lastWordPassphrase.indexOf(lastWordLastPassphrase) !== -1 )) {
      // we just want one letter to be different - only "manual" typing, don't suggest on copy/paste stuff
      const bip39 = require('bip39');
      const englishWordlist = bip39.wordlists.english;
      this.wordSuggestions = englishWordlist.filter( word => word.indexOf(lastWordPassphrase) === 0 );
    }
  }

  suggestionClick(index) {
    const wordsPassphrase = this.addressOrPassphrase.split(' ');
    wordsPassphrase[wordsPassphrase.length - 1] = this.wordSuggestions[index];
    this.addressOrPassphrase = wordsPassphrase.join(' ');
    this.updatePassphraseHidden();

    this.wordSuggestions = [];
    const inputPassphrase = this.inputAddressOrPassphrase || this.inputPassphraseHidden;
    inputPassphrase.setFocus();
  }
}
