export class StringUtil {
  public static StringContainsSeparatedWord(str: string, word: string): boolean {
    if (str === word ||
      str.search(" " + word) !== -1 ||
      str.search(word + " ") !== -1 ||
      str.search(word + ".") !== -1) {
      return true;
    }
    return false;
  }
}
