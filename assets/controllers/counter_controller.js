import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['count'];

    connect() {
        this.value = 0;
    }

    increment() {
        this.value++;
        this.countTarget.textContent = this.value;
    }

    decrement() {
        this.value--;
        this.countTarget.textContent = this.value;
    }

    reset() {
        this.value = 0;
        this.countTarget.textContent = this.value;
    }
}
