const SGR_SEQUENCE = /^(?:\x1b\[|\x9b)([0-9:;]*)m$/;

/** Semantic SGR state used when a stream must reapply only active attributes. */
export class SgrState {
  private readonly attributes = new Map<string, string>();

  apply(sequence: string): boolean {
    const match = SGR_SEQUENCE.exec(sequence);
    if (!match) return false;
    const normalized = match[1]
      .replace(/(38|48|58):2::?(\d+):(\d+):(\d+)/g, '$1;2;$2;$3;$4')
      .replace(/(38|48|58):5:(\d+)/g, '$1;5;$2');
    const params = normalized === '' ? ['0'] : normalized.split(';');
    for (let index = 0; index < params.length; index++) {
      const value = params[index];
      const code = Number(value.split(':', 1)[0]);
      if (code === 0) {
        this.attributes.clear();
      } else if (code === 1) {
        this.attributes.set('bold', value);
      } else if (code === 2) {
        this.attributes.set('faint', value);
      } else if (code === 22) {
        this.attributes.delete('bold');
        this.attributes.delete('faint');
      } else if (code === 3 || code === 23) {
        this.setOrDelete('italic', value, code === 23);
      } else if (code === 4 || code === 21 || code === 24) {
        this.setOrDelete('underline', value, code === 24);
      } else if (code === 5 || code === 6 || code === 25) {
        this.setOrDelete('blink', value, code === 25);
      } else if (code === 7 || code === 27) {
        this.setOrDelete('reverse', value, code === 27);
      } else if (code === 8 || code === 28) {
        this.setOrDelete('conceal', value, code === 28);
      } else if (code === 9 || code === 29) {
        this.setOrDelete('strike', value, code === 29);
      } else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
        this.attributes.set('foreground', value);
      } else if (code === 39) {
        this.attributes.delete('foreground');
      } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
        this.attributes.set('background', value);
      } else if (code === 49) {
        this.attributes.delete('background');
      } else if (code === 38 || code === 48 || code === 58) {
        const mode = Number(params[index + 1]);
        const length = mode === 2 ? 5 : mode === 5 ? 3 : 1;
        const encoded = params.slice(index, index + length).join(';');
        this.attributes.set(code === 38 ? 'foreground' : code === 48 ? 'background' : 'underlineColor', encoded);
        index += length - 1;
      } else if (code === 59) {
        this.attributes.delete('underlineColor');
      } else if (code >= 10 && code <= 19) {
        this.attributes.set('font', value);
      } else if (code === 53 || code === 55) {
        this.setOrDelete('overline', value, code === 55);
      } else {
        this.attributes.set(`code:${code}`, value);
      }
    }
    return true;
  }

  toString(): string {
    if (this.attributes.size === 0) return '';
    return `\x1b[${Array.from(this.attributes.values()).join(';')}m`;
  }

  private setOrDelete(group: string, value: string, remove: boolean): void {
    if (remove) this.attributes.delete(group);
    else this.attributes.set(group, value);
  }
}
