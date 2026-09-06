// @vitest-environment jsdom
import { beforeAll,expect,it,vi } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette';
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
it('filters and launches with arrow keys and Enter',async()=>{const user=userEvent.setup();const a=vi.fn(),b=vi.fn(),close=vi.fn();render(<CommandPalette commands={[{id:'a',label:'Open Plus 1',detail:'available',run:a},{id:'b',label:'Open Plus 2',detail:'available',run:b}]} onClose={close}/>);const input=screen.getByRole('combobox');await user.click(input);await user.type(input,'plus');await user.keyboard('{ArrowDown}{Enter}');expect(b).toHaveBeenCalledOnce();expect(a).not.toHaveBeenCalled();expect(close).toHaveBeenCalledOnce();cleanup();});
