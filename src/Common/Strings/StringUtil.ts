export class StringUtil {
  public static StringContainsSeparatedWord(str: string, wordRegExString: string, ignoreCase: boolean = false): boolean {
    const regExp: RegExp = new RegExp("( |^)" + wordRegExString + "([ .]|$)", ignoreCase ? "i" : undefined);
    return regExp.test(str);
  }
}
