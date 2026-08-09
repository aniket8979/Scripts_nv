# # import pandas as pd

# # def convert_all_sheets_to_md(input_file, output_file="output.md"):
# #     # Read all sheets into a dict of DataFrames
# #     sheets = pd.read_excel(input_file, sheet_name=None)
    
# #     with open(output_file, 'w', encoding='utf-8') as f:
# #         for sheet_name, df in sheets.items():
# #             f.write(f"### Sheet: {sheet_name}\n\n{df.to_markdown(index=False)}\n\n")

# # # Usage:
# # convert_all_sheets_to_md('workbook.xlsx', 'output.md')



# #!/usr/bin/env python3
# import argparse
# import os
# import sys
# import pandas as pd

# def convert_to_md(input_file, output_file=None):
#     if not os.path.exists(input_file):
#         print(f"Error: File '{input_file}' not found.", file=sys.stderr)
#         sys.exit(1)

#     # Default output file name if not provided
#     if output_file is None:
#         base_name = os.path.splitext(input_file)[0]
#         output_file = f"{base_name}.md"

#     ext = os.path.splitext(input_file)[1].lower()

#     try:
#         with open(output_file, 'w', encoding='utf-8') as f:
#             if ext in ['.xlsx', '.xls', '.ods']:
#                 # Read all sheets into a dict
#                 sheets = pd.read_excel(input_file, sheet_name=None)
#                 multi_sheet = len(sheets) > 1

#                 for sheet_name, df in sheets.items():
#                     if multi_sheet:
#                         f.write(f"### Sheet: {sheet_name}\n\n")
#                     f.write(f"{df.to_markdown(index=False)}\n\n")

#             elif ext in ['.csv', '.tsv', '.txt']:
#                 # Auto-detect separator (comma vs tab)
#                 df = pd.read_csv(input_file, sep=None, engine='python')
#                 f.write(f"{df.to_markdown(index=False)}\n")

#             else:
#                 print(f"Unsupported file format: {ext}", file=sys.stderr)
#                 sys.exit(1)

#         print(f"✅ Successfully converted '{input_file}' -> '{output_file}'")

#     except Exception as e:
#         print(f"Error converting file: {e}", file=sys.stderr)
#         sys.exit(1)





        

# def main():
#     parser = argparse.ArgumentParser(
#         description="CLI tool to convert spreadsheet and tabular files (XLSX, XLS, ODS, CSV, TSV) to Markdown tables."
#     )
#     parser.add_argument(
#         "input_file", 
#         help="Path to the input file (e.g., workbook.xlsx, data.ods, data.csv)"
#     )
#     parser.add_argument(
#         "-o", "--output", 
#         help="Path to output Markdown file (default: <input_filename>.md)", 
#         default=None
#     )

#     args = parser.parse_args()
#     convert_to_md(args.input_file, args.output)

# if __name__ == "__main__":
#     main()


#!/usr/bin/env python3
import argparse
import os
import sys
import pandas as pd

def clean_dataframe(df):
    """
    Cleans a DataFrame for clean Markdown rendering:
    - Drops completely empty rows and columns.
    - Replaces NaN values with empty strings.
    - Strips 'Unnamed:' headers from empty excel columns.
    - Converts internal newlines to HTML line breaks (<br>).
    """
    # 1. Drop rows and columns that are 100% empty/NaN
    df = df.dropna(how='all').dropna(how='all', axis=1)

    # 2. Clean up unnamed column headers (common in Excel reads)
    cleaned_cols = []
    for col in df.columns:
        col_str = str(col)
        if col_str.startswith("Unnamed:"):
            cleaned_cols.append("")
        else:
            cleaned_cols.append(col_str)
    df.columns = cleaned_cols

    # 3. Fill NaN / None / NaT values with an empty string
    df = df.fillna("")

    # 4. Handle newline characters within cells so markdown table rows don't break
    # df = df.applymap(lambda x: str(x).replace('\n', '<br>') if isinstance(x, str) else x)  # Not Working as it is depricated
    df = df.map(lambda x: str(x).replace('\n', '<br>') if isinstance(x, str) else x)   # THis is new version of applymap

    return df

def convert_to_md(input_file, output_file=None):
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found.", file=sys.stderr)
        sys.exit(1)

    if output_file is None:
        base_name = os.path.splitext(input_file)[0]
        output_file = f"{base_name}.md"

    ext = os.path.splitext(input_file)[1].lower()

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            if ext in ['.xlsx', '.xls', '.ods']:
                sheets = pd.read_excel(input_file, sheet_name=None)
                multi_sheet = len(sheets) > 1

                for sheet_name, df in sheets.items():
                    df = clean_dataframe(df)
                    # Skip writing sheets that turned out to be completely empty
                    if df.empty:
                        continue

                    if multi_sheet:
                        f.write(f"### Sheet: {sheet_name}\n\n")
                    f.write(f"{df.to_markdown(index=False)}\n\n")

            elif ext in ['.csv', '.tsv', '.txt']:
                df = pd.read_csv(input_file, sep=None, engine='python')
                df = clean_dataframe(df)
                f.write(f"{df.to_markdown(index=False)}\n")

            else:
                print(f"Unsupported file format: {ext}", file=sys.stderr)
                sys.exit(1)

        print(f"✅ Successfully converted '{input_file}' -> '{output_file}'")

    except Exception as e:
        print(f"Error converting file: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="CLI tool to convert spreadsheet and tabular files to clean Markdown tables."
    )
    parser.add_argument("input_file", help="Path to input file")
    parser.add_argument("-o", "--output", help="Path to output Markdown file", default=None)

    args = parser.parse_args()
    convert_to_md(args.input_file, args.output)

if __name__ == "__main__":
    main()