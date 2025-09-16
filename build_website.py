import os
import shutil

_output_path = r"C:\Users\tyler\OneDrive\Desktop\Built_Website"
_input_path = r"C:\Users\tyler\OneDrive\Desktop\Grade Website"

def main():
    # Delete all files in the output path
    for file in os.listdir(_output_path):
        file_path = os.path.join(_output_path, file)
        if os.path.isfile(file_path):
            os.remove(file_path)

    # Copy all files from the input path to the output path
    static_path = os.path.join(_input_path, 'static')
    for file in os.listdir(static_path):
        file_path = os.path.join(static_path, file)
        if os.path.isfile(file_path):
            shutil.copy(file_path, _output_path)

    templates_path = os.path.join(_input_path, 'templates')
    index_html_path = os.path.join(templates_path, 'index.html')
    shutil.copy(index_html_path, _output_path)

    # Replace the flask static paths in the index.html file
    new_index_html_path = os.path.join(_output_path, 'index.html')
    with open(new_index_html_path, 'r', encoding="utf-8") as f:
        content = f.read()

    content = content.replace("{{ url_for('static', filename='styles.css') }}", "styles.css")
    content = content.replace("{{ url_for('static', filename='calculator.js') }}", "calculator.js")

    with open(new_index_html_path, 'w', encoding="utf-8") as f:
        f.write(content)

    print("Finished Building Website!")


if __name__ == '__main__':
    main()
