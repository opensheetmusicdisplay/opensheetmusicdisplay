export class StringUtil {
  public static StringContainsSeparatedWord(str: string, wordRegExString: string, ignoreCase: boolean = false): boolean {
    const regExp: RegExp = new RegExp("( |^)" + wordRegExString + "([ .]|$)", ignoreCase ? "i" : undefined);
    return regExp.test(str);
  }

  /**
   * Checks whether the entire string is the given word or phrase, i.e. doesn't just contain it within a longer text.
   * Trailing spaces and periods are allowed, e.g. "D.C. al Fine." still matches "d\.c\. al fine".
   * @param str the string to check. Should already be trimmed (no leading/trailing whitespace).
   * @param wordRegExString the word or phrase to check for, given as a regular expression string (input for new RegExp())
   * @param ignoreCase whether to match case-insensitively
   * @returns true if str is (only) the given word or phrase
   */
  public static StringIsWord(str: string, wordRegExString: string, ignoreCase: boolean = false): boolean {
    const regExp: RegExp = new RegExp("^(" + wordRegExString + ")[ .]*$", ignoreCase ? "i" : undefined);
    return regExp.test(str);
  }
}
