import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const notEmpty = <T>(val: T | null | undefined): val is T => val !== null && val !== undefined

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
