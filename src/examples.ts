export interface CairoExample {
  name: string;
  executable: string;
  sourceCode: string;
}

export const PREDEFINED_EXAMPLES: CairoExample[] = [
  {
    name: "Fibonacci Calculator",
    executable:
      '{"program":{"bytecode":["0x40780017fff7fff","0x1","0x1104800180018000","0x4","0x10780017fff7fff","0x0","0x480a7ffd7fff8002","0x480a7ffd7fff8002","0x40780017fff7fff","0x2","0x1104800180018000","0x7","0x480680017fff8000","0x0","0x40127ffc7fff7fff","0x48127ffe7fff8000","0x208b7fff7fff7ffe","0x48297ffa80007ffb","0x20680017fff7fff","0x4","0x10780017fff7fff","0x20","0x482680017ffa8000","0x1","0x480a7ffb7fff8000","0x480280007ffa8000","0x48307ffd80007ffe","0x20680017fff7fff","0x4","0x10780017fff7fff","0x9","0x1104800180018000","0x1c","0x480680017fff8000","0x1","0x48127ffd7fff8000","0x48127ffd7fff8000","0x208b7fff7fff7ffe","0x480680017fff8000","0x0","0x480680017fff8000","0x1","0x48127ffc7fff8000","0x1104800180018000","0x19","0x400280007ffd7fff","0x480680017fff8000","0x0","0x480a7ffc7fff8000","0x482680017ffd8000","0x1","0x208b7fff7fff7ffe","0x1104800180018000","0x1b","0x480680017fff8000","0x1","0x48127ffd7fff8000","0x48127ffd7fff8000","0x208b7fff7fff7ffe","0x40780017fff7fff","0x1","0x480680017fff8000","0x496e70757420746f6f206c6f6e6720666f7220706172616d732e","0x400080007ffe7fff","0x48127ffe7fff8000","0x482480017ffd8000","0x1","0x208b7fff7fff7ffe","0x20780017fff7ffd","0x4","0x480a7ffb7fff8000","0x208b7fff7fff7ffe","0x480a7ffc7fff8000","0x482a7ffc7ffb8000","0x4825800180007ffd","0x1","0x1104800180018000","-0x8","0x208b7fff7fff7ffe","0x40780017fff7fff","0x1","0x480680017fff8000","0x4661696c656420746f20646573657269616c697a6520706172616d202330","0x400080007ffe7fff","0x48127ffe7fff8000","0x482480017ffd8000","0x1","0x208b7fff7fff7ffe","0x208b7fff7fff7ffe"],"hints":[[6,[{"WriteRunParam":{"index":{"Immediate":"0x0"},"dst":{"register":"AP","offset":0}}}]],[14,[{"AddMarker":{"start":{"Deref":{"register":"AP","offset":-3}},"end":{"Deref":{"register":"AP","offset":-2}}}}]],[59,[{"AllocSegment":{"dst":{"register":"AP","offset":0}}}]],[79,[{"AllocSegment":{"dst":{"register":"AP","offset":0}}}]]]},"entrypoints":[{"builtins":["output"],"offset":0,"kind":"Standalone"},{"builtins":["output"],"offset":6,"kind":"Bootloader"}]}',
    sourceCode: `#[executable]
fn main(n: felt252) -> felt252 {
    fib(0, 1, n)
}

fn fib(a: felt252, b: felt252, n: felt252) -> felt252 {
    match n {
        0 => a,
        _ => fib(b, a + b, n - 1),
    }
}`,
  },
  {
    name: "Simple Addition",
    executable:
      '{"program":{"bytecode":["0x40780017fff7fff","0x1","0x1104800180018000","0x4","0x10780017fff7fff","0x0","0x480a7ffd7fff8002","0x480a7ffd7fff8002","0x40780017fff7fff","0x2","0x1104800180018000","0x7","0x480680017fff8000","0x0","0x40127ffc7fff7fff","0x48127ffe7fff8000","0x208b7fff7fff7ffe","0x48297ffa80007ffb","0x20680017fff7fff","0x4","0x10780017fff7fff","0x2e","0x482680017ffa8000","0x1","0x480a7ffb7fff8000","0x480280007ffa8000","0x48307ffd80007ffe","0x20680017fff7fff","0x4","0x10780017fff7fff","0x1c","0x482480017ffc8000","0x1","0x48127ffc7fff8000","0x480080007ffa8000","0x48307ffd80007ffe","0x20680017fff7fff","0x4","0x10780017fff7fff","0x9","0x1104800180018000","0x23","0x480680017fff8000","0x1","0x48127ffd7fff8000","0x48127ffd7fff8000","0x208b7fff7fff7ffe","0x40780017fff7fff","0x5","0x48307ff97ff58000","0x400280007ffd7fff","0x480680017fff8000","0x0","0x480a7ffc7fff8000","0x482680017ffd8000","0x1","0x208b7fff7fff7ffe","0x40780017fff7fff","0x4","0x1104800180018000","0x19","0x480680017fff8000","0x1","0x48127ffd7fff8000","0x48127ffd7fff8000","0x208b7fff7fff7ffe","0x40780017fff7fff","0x8","0x1104800180018000","0x19","0x480680017fff8000","0x1","0x48127ffd7fff8000","0x48127ffd7fff8000","0x208b7fff7fff7ffe","0x40780017fff7fff","0x1","0x480680017fff8000","0x496e70757420746f6f206c6f6e6720666f7220706172616d732e","0x400080007ffe7fff","0x48127ffe7fff8000","0x482480017ffd8000","0x1","0x208b7fff7fff7ffe","0x40780017fff7fff","0x1","0x480680017fff8000","0x4661696c656420746f20646573657269616c697a6520706172616d202331","0x400080007ffe7fff","0x48127ffe7fff8000","0x482480017ffd8000","0x1","0x208b7fff7fff7ffe","0x40780017fff7fff","0x1","0x480680017fff8000","0x4661696c656420746f20646573657269616c697a6520706172616d202330","0x400080007ffe7fff","0x48127ffe7fff8000","0x482480017ffd8000","0x1","0x208b7fff7fff7ffe","0x208b7fff7fff7ffe"],"hints":[[6,[{"WriteRunParam":{"index":{"Immediate":"0x0"},"dst":{"register":"AP","offset":0}}}]],[14,[{"AddMarker":{"start":{"Deref":{"register":"AP","offset":-3}},"end":{"Deref":{"register":"AP","offset":-2}}}}]],[75,[{"AllocSegment":{"dst":{"register":"AP","offset":0}}}]],[84,[{"AllocSegment":{"dst":{"register":"AP","offset":0}}}]],[93,[{"AllocSegment":{"dst":{"register":"AP","offset":0}}}]]]},"entrypoints":[{"builtins":["output"],"offset":0,"kind":"Standalone"},{"builtins":["output"],"offset":6,"kind":"Bootloader"}]}',
    sourceCode: `#[executable]
fn main(a: felt252, b: felt252) -> felt252 {
    add(a, b)
}

fn add(a: felt252, b: felt252) -> felt252 {
    a + b
}`,
  },
];
