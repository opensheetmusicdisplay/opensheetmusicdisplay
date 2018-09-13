export class StringUtil {
  public static StringContainsSeparatedWord(str: string, wordRegExString: string): boolean {
    if (new RegExp("( |^)" + wordRegExString + "([ .]|$)").test(str)) {
      return true;
    }
    return false;
  }
}
