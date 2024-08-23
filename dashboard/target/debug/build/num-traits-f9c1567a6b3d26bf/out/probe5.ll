; ModuleID = 'probe5.42758fcb7bb317e0-cgu.0'
source_filename = "probe5.42758fcb7bb317e0-cgu.0"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128"
target triple = "arm64-apple-macosx11.0.0"

@alloc_73f46ec298cadb9be96e919871e03a52 = private unnamed_addr constant <{ [75 x i8] }> <{ [75 x i8] c"/rustc/31bc7e2c47e82798a392c770611975a6883132c8/library/core/src/num/mod.rs" }>, align 1
@alloc_20f6ef3567a4d3e8a33f0f46e9e1ecee = private unnamed_addr constant <{ ptr, [16 x i8] }> <{ ptr @alloc_73f46ec298cadb9be96e919871e03a52, [16 x i8] c"K\00\00\00\00\00\00\00y\04\00\00\05\00\00\00" }>, align 8
@str.0 = internal constant [25 x i8] c"attempt to divide by zero"

; probe5::probe
; Function Attrs: uwtable
define void @_ZN6probe55probe17hfee2affccf0b3e06E() unnamed_addr #0 {
start:
  %0 = call i1 @llvm.expect.i1(i1 false, i1 false)
  br i1 %0, label %panic.i, label %"_ZN4core3num21_$LT$impl$u20$u32$GT$10div_euclid17h6e4ebde2c9b9094cE.exit"

panic.i:                                          ; preds = %start
; call core::panicking::panic
  call void @_ZN4core9panicking5panic17h00f4ccf4c57307adE(ptr align 1 @str.0, i64 25, ptr align 8 @alloc_20f6ef3567a4d3e8a33f0f46e9e1ecee) #3
  unreachable

"_ZN4core3num21_$LT$impl$u20$u32$GT$10div_euclid17h6e4ebde2c9b9094cE.exit": ; preds = %start
  ret void
}

; Function Attrs: nocallback nofree nosync nounwind willreturn memory(none)
declare i1 @llvm.expect.i1(i1, i1) #1

; core::panicking::panic
; Function Attrs: cold noinline noreturn uwtable
declare void @_ZN4core9panicking5panic17h00f4ccf4c57307adE(ptr align 1, i64, ptr align 8) unnamed_addr #2

attributes #0 = { uwtable "frame-pointer"="non-leaf" "target-cpu"="apple-m1" }
attributes #1 = { nocallback nofree nosync nounwind willreturn memory(none) }
attributes #2 = { cold noinline noreturn uwtable "frame-pointer"="non-leaf" "target-cpu"="apple-m1" }
attributes #3 = { noreturn }

!llvm.module.flags = !{!0}
!llvm.ident = !{!1}

!0 = !{i32 8, !"PIC Level", i32 2}
!1 = !{!"rustc version 1.75.0-nightly (31bc7e2c4 2023-10-30)"}
