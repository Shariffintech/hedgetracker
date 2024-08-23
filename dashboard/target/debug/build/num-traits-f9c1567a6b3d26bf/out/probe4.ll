; ModuleID = 'probe4.d92fc84a6bb85157-cgu.0'
source_filename = "probe4.d92fc84a6bb85157-cgu.0"
target datalayout = "e-m:o-i64:64-i128:128-n32:64-S128"
target triple = "arm64-apple-macosx11.0.0"

@alloc_5c09ca8438a3a43826d74ef12211ee54 = private unnamed_addr constant <{ [77 x i8] }> <{ [77 x i8] c"/rustc/31bc7e2c47e82798a392c770611975a6883132c8/library/core/src/ops/arith.rs" }>, align 1
@alloc_6a613cfb9aebda4c8d6b4e88e90334df = private unnamed_addr constant <{ ptr, [16 x i8] }> <{ ptr @alloc_5c09ca8438a3a43826d74ef12211ee54, [16 x i8] c"M\00\00\00\00\00\00\00\F8\02\00\00\01\00\00\00" }>, align 8
@str.0 = internal constant [28 x i8] c"attempt to add with overflow"
@alloc_2e38410fced2c310c68bdf2d45d0c3bd = private unnamed_addr constant <{ [4 x i8] }> <{ [4 x i8] c"\02\00\00\00" }>, align 4

; <i32 as core::ops::arith::AddAssign<&i32>>::add_assign
; Function Attrs: inlinehint uwtable
define internal void @"_ZN66_$LT$i32$u20$as$u20$core..ops..arith..AddAssign$LT$$RF$i32$GT$$GT$10add_assign17h2a455446e54acf0fE"(ptr align 4 %self, ptr align 4 %other) unnamed_addr #0 {
start:
  %other1 = load i32, ptr %other, align 4, !noundef !2
  %0 = load i32, ptr %self, align 4, !noundef !2
  %1 = call { i32, i1 } @llvm.sadd.with.overflow.i32(i32 %0, i32 %other1)
  %_4.0 = extractvalue { i32, i1 } %1, 0
  %_4.1 = extractvalue { i32, i1 } %1, 1
  %2 = call i1 @llvm.expect.i1(i1 %_4.1, i1 false)
  br i1 %2, label %panic, label %bb1

bb1:                                              ; preds = %start
  store i32 %_4.0, ptr %self, align 4
  ret void

panic:                                            ; preds = %start
; call core::panicking::panic
  call void @_ZN4core9panicking5panic17h00f4ccf4c57307adE(ptr align 1 @str.0, i64 28, ptr align 8 @alloc_6a613cfb9aebda4c8d6b4e88e90334df) #5
  unreachable
}

; probe4::probe
; Function Attrs: uwtable
define void @_ZN6probe45probe17hddfd268e756fe192E() unnamed_addr #1 {
start:
  %x = alloca i32, align 4
  store i32 1, ptr %x, align 4
; call <i32 as core::ops::arith::AddAssign<&i32>>::add_assign
  call void @"_ZN66_$LT$i32$u20$as$u20$core..ops..arith..AddAssign$LT$$RF$i32$GT$$GT$10add_assign17h2a455446e54acf0fE"(ptr align 4 %x, ptr align 4 @alloc_2e38410fced2c310c68bdf2d45d0c3bd)
  ret void
}

; Function Attrs: nocallback nofree nosync nounwind speculatable willreturn memory(none)
declare { i32, i1 } @llvm.sadd.with.overflow.i32(i32, i32) #2

; Function Attrs: nocallback nofree nosync nounwind willreturn memory(none)
declare i1 @llvm.expect.i1(i1, i1) #3

; core::panicking::panic
; Function Attrs: cold noinline noreturn uwtable
declare void @_ZN4core9panicking5panic17h00f4ccf4c57307adE(ptr align 1, i64, ptr align 8) unnamed_addr #4

attributes #0 = { inlinehint uwtable "frame-pointer"="non-leaf" "target-cpu"="apple-m1" }
attributes #1 = { uwtable "frame-pointer"="non-leaf" "target-cpu"="apple-m1" }
attributes #2 = { nocallback nofree nosync nounwind speculatable willreturn memory(none) }
attributes #3 = { nocallback nofree nosync nounwind willreturn memory(none) }
attributes #4 = { cold noinline noreturn uwtable "frame-pointer"="non-leaf" "target-cpu"="apple-m1" }
attributes #5 = { noreturn }

!llvm.module.flags = !{!0}
!llvm.ident = !{!1}

!0 = !{i32 8, !"PIC Level", i32 2}
!1 = !{!"rustc version 1.75.0-nightly (31bc7e2c4 2023-10-30)"}
!2 = !{}
