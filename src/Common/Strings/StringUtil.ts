export class StringUtil {
  public static StringContainsSeparatedWord(str: string, wordRegExString: string): boolean {
    if (new RegExp("(^" + wordRegExString + "$)|" + // exact match
      "( " + wordRegExString + ")|" + // " " + str
      "(" + wordRegExString + "[ .])" // str + " " or "."
      ).test(str)) {
      return true;
    }
    return false;
  }
}
