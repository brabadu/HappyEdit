#!/usr/bin/env python

import subprocess

def status():
    lines = subprocess.check_output(['git', 'status'])

    modified_files = []
    for line in lines.split('\n'):
        if line.find('modified:') != -1:
            modified_files.append(line.split('modified:')[1].strip())
    return {
        'modified': modified_files
    }

def main():
    print status()

if __name__ == '__main__':
    main()
