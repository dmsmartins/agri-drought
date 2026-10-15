#!/usr/bin/env Rscript
# Reference-package bridge. Run locally, not inside GitHub Pages.
# Rscript scripts/benchmarks.R clima_mensal_benchmarks.csv indices_externos.csv 1985 2014
# Requires installed SPEI and scPDSI packages. No package installation is performed.
args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 4L) stop('Usage: Rscript benchmarks.R input.csv output.csv reference_start reference_end')
for (pkg in c('SPEI', 'scPDSI')) {
  if (!requireNamespace(pkg, quietly = TRUE)) stop(paste('Missing package:', pkg, '- install from the package maintainer before running.'))
}
ref_start <- as.integer(args[3]); ref_end <- as.integer(args[4])
if (is.na(ref_start) || is.na(ref_end) || ref_end-ref_start+1L < 30L) stop('Use at least 30 complete reference years.')
d <- read.csv(args[1], stringsAsFactors = FALSE, check.names = FALSE)
required <- c('station_id','month','P_mm','PET_mm','AWC_mm')
if (!all(required %in% names(d))) stop(paste('Missing columns. Required:', paste(required, collapse=',')))
if (anyNA(d$station_id) || any(!nzchar(d$station_id))) stop('Missing station_id')
output <- list(); nout <- 0L
for (id in unique(d$station_id)) {
  x <- d[d$station_id == id, ]; x <- x[order(x$month), ]
  if (any(!grepl('^[0-9]{4}-(0[1-9]|1[0-2])$', x$month)) || anyDuplicated(x$month)) stop(paste(id,'invalid/duplicate month'))
  dates <- as.Date(paste0(x$month,'-01'))
  expected <- seq(dates[1], dates[length(dates)], by='month')
  if (length(expected)!=nrow(x) || any(format(expected,'%Y-%m')!=x$month)) stop(paste(id,'missing months'))
  if (substr(x$month[1],6,7)!='01' || substr(tail(x$month,1),6,7)!='12') stop(paste(id,'requires complete calendar years for scPDSI'))
  for (key in c('P_mm','PET_mm','AWC_mm')) if (!is.numeric(x[[key]]) || any(!is.finite(x[[key]])) || any(x[[key]]<0)) stop(paste(id,'invalid',key))
  if (length(unique(x$AWC_mm))!=1L || x$AWC_mm[1]<=0) stop(paste(id,'requires a positive constant AWC'))
  y0 <- as.integer(substr(x$month[1],1,4)); y1 <- as.integer(substr(tail(x$month,1),1,4))
  if (y0>=ref_start || y1<ref_end) stop(paste(id,'requires antecedent data before calibration and full reference coverage'))
  P <- ts(x$P_mm,start=c(y0,1),frequency=12)
  PET <- ts(x$PET_mm,start=c(y0,1),frequency=12)
  append_index <- function(value,index,scale,source) {
    value <- as.numeric(value)
    if (length(value)!=nrow(x)) stop('Unexpected package output length')
    value[!is.finite(value)] <- NA_real_
    data.frame(station_id=id,month=x$month,index=index,scale=scale,value=value,source=source,ref_start=ref_start,ref_end=ref_end,stringsAsFactors=FALSE)
  }
  for (k in c(1L,3L,6L,12L)) {
    spi <- SPEI::spi(P,scale=k,distribution='Gamma',fit='ub-pwm',ref.start=c(ref_start,1),ref.end=c(ref_end,12),verbose=FALSE)
    spei <- SPEI::spei(P-PET,scale=k,distribution='log-Logistic',fit='ub-pwm',ref.start=c(ref_start,1),ref.end=c(ref_end,12),verbose=FALSE)
    nout <- nout+1L; output[[nout]] <- append_index(spi$fitted,'SPI',k,paste0('R SPEI ',utils::packageVersion('SPEI'),'; Gamma; ub-pwm'))
    nout <- nout+1L; output[[nout]] <- append_index(spei$fitted,'SPEI',k,paste0('R SPEI ',utils::packageVersion('SPEI'),'; log-Logistic; ub-pwm; PET=provided ET0'))
  }
  pd <- scPDSI::pdsi(P, PET, AWC=x$AWC_mm[1],start=y0,end=y1,cal_start=ref_start,cal_end=ref_end,sc=TRUE)
  nout <- nout+1L; output[[nout]] <- append_index(pd$X,'scPDSI',0L,paste0('R scPDSI ',utils::packageVersion('scPDSI'),'; retrospective; PET=provided ET0; AWC=',x$AWC_mm[1]))
}
write.csv(do.call(rbind,output),args[2],row.names=FALSE,na='')
capture.output(sessionInfo(),file=paste0(args[2],'.session.txt'))
message('Reference indices exported. Check numerical flags, station metadata and calibration before scientific use.')
