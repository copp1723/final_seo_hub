declare module 'csv-parse/sync' {
  export interface Options {
    columns?: boolean | string[] | ((record: any) => string[]);
    skip_empty_lines?: boolean;
    trim?: boolean;
    cast?: boolean;
    [key: string]: any;
  }
  
  export function parse(input: string | Buffer, options?: Options): any[];
} 