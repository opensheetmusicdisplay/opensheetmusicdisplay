import xml.etree.ElementTree as ET
import re, sys, os

replace = (
    ("Math\\.Max\\(", "Math.max("),
    ("Math\\.Min\\(", "Math.min("),
    ("Math\\.Sqrt\\(", "Math.sqrt("),
    ("Math\\.Abs\\(", "Math.abs("),
    ("Math\\.Pow\\(", "Math.pow("),
    ("Math\\.Ceiling", "Math.ceil"),
    ("Math\\.Floor", "Math.floor"),

    ("var ", "let "),

    # Lists --> Arrays
    ("new List<List<([a-zA-Z]*)>>\(\)", "[]"),
    ("List<List<([a-zA-Z]*)>>", "$1[][]"),
    ("new List<([a-zA-Z]*)>\(\)", "[]"),
    ("List<([a-zA-Z]*)>", "$1[]"),

    # Dictionaries:
    ("new Dictionary<number, ([a-zA-Z0-9\\[\\]\\.]*)>\\(\\)", "{}"),
    ("Dictionary<number, ([a-zA-Z0-9\\[\\]\\.]*)>", "{ [_: number]: $1; }"),
    ("new Dictionary<string, ([a-zA-Z0-9\\[\\]\\.]*)>\\(\\)", "{}"),
    ("Dictionary<string, ([a-zA-Z0-9\\[\\]\\.]*)>", "{ [_: string]: $1; }"),

    ("IEnumerable<([a-zA-Z0-9]+)>", "$1[]"),

    ("\\.Count", ".length"),
    ("\\.Length", ".length"),
    ("\\.Add\(", ".push("),
    ("\\.First\(\)", "[0]"),

    ("\\.Insert\((.*), (.*)\)", ".splice($1, 0, $2)"),
    ("\\.RemoveAt\(([a-z|0-9]+)\)", ".splice($1, 1)"),
    ("\\.Clear\(\);", ".length = 0;"),
    ("\\.IndexOf", ".indexOf"),
    ("\\.ToArray\\(\\)", ""),
    ("\\.ContainsKey", ".hasOwnProperty"),

    ("\\.Contains\(([a-zA-Z0-9.]+)\)", ".indexOf($1) !== -1"),

    ("for each(?:[ ]*)\(([a-z|0-9]+) ([a-z|0-9]+) in ([a-z|0-9]+)\)", "for ($2 of $3)"),
    (", len([0-9]*) = ", ", len$1: number = "),

    (" == ", " === "),
    (" != ", " !== "),
    ("null", "undefined"),

    ("\\.ToLower\(\)", ".toLowerCase()"),

    ("Logger\\.DefaultLogger\\.LogError\(LogLevel\\.DEBUG,(?:[ ]*)", "Logging.debug("),
    ("Logger\\.DefaultLogger\\.LogError\(LogLevel\\.NORMAL,(?:[ ]*)", "Logging.log("),
    ("Logger\\.DefaultLogger\\.LogError\(PhonicScore\\.Common\\.Enums\\.LogLevel\\.NORMAL,(?:[ ]*)", "Logging.log("),

    ("Fraction\\.CreateFractionFromFraction\(([a-z|0-9]+)\)", "$1.clone()"),

    ("(\d{1})f([,;)\]} ])", "$1$2"),
    ("number\\.MaxValue", "Number.MAX_VALUE"),
    ("Int32\\.MaxValue", "Number.MAX_VALUE"),
    ("number\\.MinValue", "Number.MIN_VALUE"),

    ("__as__<([A-Za-z|0-9]+)>\(([A-Za-z|0-9.]+), ([A-Za-z|0-9]+)\)", "($2 as $3)"),

    ("new Dictionary<number, number>\(\)", "{}"),
    (": Dictionary<number, number>", ": {[_: number]: number; }"),

    ("String\\.Empty", '""'),
    ("return\\n", "return;\n"),

    ("}(\n[ ]*)else ", "} else "),

    ("\\.IdInMusicSheet", ".idInMusicSheet"),
    ("F_2D", "F2D"),
)

def checkForIssues(filename, content):
    if ".Last()" in content:
        print("      !!! Warning: .Last() found !!!")

def applyAll():
    root = sys.argv[1]
    filenames = []
    recurse(root, filenames)
    # if os.path.isdir(root):
    #     recurse(root, filenames)
    # else:
    #     filenames.append(root)

    print("Apply replacements to:")
    for filename in filenames:
        print("  >>> " + os.path.basename(filename))
        content = None
        with open(filename) as f:
            content = f.read()
        checkForIssues(filename, content)
        for rep in replace:
            content = re.sub(rep[0], pythonic(rep[1]), content)
        with open(filename, "w") as f:
            f.write(content)
    print("Done.")

def recurse(folder, files):
    if os.path.isfile(folder):
        files.append(folder)
    if os.path.isdir(folder):
        for i in os.listdir(folder):
            recurse(os.path.join(folder, i), files)

def keycode(c):
    if len(c) > 1:
        return ";".join(keycode(i) for i in c)
    if c.isalpha():
        return str(ord(c.upper())) + ":" + ("1" if c.isupper() else "0")
    if c.isdigit():
        return str(48 + int(c)) + ":0"
    return {'!': '49:1', '#': '51:1', '%': '53:1', '$': '52:1', "'": '222:0', '&': '55:1', ')': '48:1', '(': '57:1', '+': '61:1', '*': '56:1', '-': '45:0', ',': '44:0', '/': '47:0', '.': '46:0', ';': '59:0', ':': '59:1', '=': '61:0', '@': '50:1', '[': '91:0', ']': '93:0', '\\': '92:0', '_': '45:1', '^': '54:1', 'a': '65:0', '<': '44:1', '>': '46', ' ': "32:0", "|": "92:1", "?": "47:1", "{": "91:1", "}": "93:1"}[c]

def escape(s):
    return s
    return s.replace("&", "&amp;").replace(">", "&gt;").replace("<", "&lt;")

def generate():
    N = 0
    macroName = "TypeScript'ing Replacements"
    macro = ET.Element("macro")
    macro.set("name", macroName)
    replace = (("ABCDEfGHIJKL", "ABCDEfGHIJKL"),) + replace
    for rep in replace:
        N += 1
        # result.append('<macro name="%d">' % N)
        ET.SubElement(macro, "action").set("id", "$SelectAll")
        ET.SubElement(macro, "action").set("id", "Replace")
        for s in rep[0]:
            t = ET.SubElement(macro, "typing")
            t.set("text-keycode", keycode(s))
            t.text = escape(s)
        ET.SubElement(macro, "shortuct").set("text", "TAB")
        for s in rep[1]:
            t = ET.SubElement(macro, "typing")
            t.set("text-keycode", keycode(s))
            t.text = escape(s)
        # result.append('<action id="EditorEnter" />' * 50)
        for i in range(50):
            ET.SubElement(macro, "shortuct").set("text", "ENTER")
        ET.SubElement(macro, "shortuct").set("text", "ESCAPE")


    path = '/Users/acondolu/Library/Preferences/WebStorm11/options/macros.xml'
    tree = None
    try:
        tree = ET.parse(path)
    except IOError:
        print("Cannot find macro file.")
        sys.exit(1)
    component = tree.getroot().find("component")
    assert component.get("name") == "ActionMacroManager"
    found = None
    for m in component.iter("macro"):
        if m.get("name") == macroName:
            found = m
            break
    if found is not None:
        component.remove(found)

    component.append(macro)

    tree.write(path)
    print("Macro written on " + path)

def pythonic(s):
    return s.replace("$", "\\")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python macrogen.py path/to/files")
        sys.exit(1)
        # generate()
    else:
        applyAll()
