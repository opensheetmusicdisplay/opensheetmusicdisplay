export class StringUtil {
  /**
   * Checks whether the string contains the given word or phrase as a separate word, not as part of a longer word:
   * it has to be at the start of the string or after a space, and at the end or before a space or period.
   * E.g. with ignoreCase, "Menuetto D.C. al Fine" contains "d\.c\. al fine", and "To Coda." contains "coda",
   * but "Codas" doesn't. To check whether the whole string is the word or phrase, use StringIsWord().
   * @param str the string to search
   * @param wordRegExString the word or phrase to find, given as a regular expression string (input for new RegExp()),
   *   so characters like "." need to be escaped
   * @param ignoreCase whether to match case-insensitively
   * @returns true if str contains the word or phrase as a separate word
   */
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
