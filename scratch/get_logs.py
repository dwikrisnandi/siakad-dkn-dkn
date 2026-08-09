import pexpect
import sys

def main():
    try:
        child = pexpect.spawn(f'ssh dwi@100.91.77.123', encoding='utf-8')
        child.expect('password:')
        child.sendline('aku')
        child.expect(r'\$')
        
        child.sendline('journalctl -u SiakadServer -n 50 --no-pager')
        child.expect(r'\$')
        print(child.before)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
