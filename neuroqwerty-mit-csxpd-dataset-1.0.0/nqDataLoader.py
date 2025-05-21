# -*- coding: utf-8 -*-
import numpy as np
import sys, os, re, datetime


class NqDataLoader:
    FLT_NO_MOUSE = 1 << 0
    FLT_NO_LETTERS = 1 << 1
    FLT_NO_BACK = 1 << 2
    FLT_NO_SHORT_META = 1 << 3
    FLT_NO_LONG_META = 1 << 4
    FLT_NO_PUNCT = 1 << 5

    def __init__(self):
        self.dataKeys = None
        self.dataHT = None
        self.dataTimeStart = None
        self.dataTimeEnd = None
        self.dataFT = None
        self.lbl = None

    def sanityCheck(self):
        assert self.dataKeys is not None and len(self.dataKeys) > 0
        assert self.dataHT is not None and len(self.dataHT) > 0
        assert self.dataTimeStart is not None and len(self.dataTimeStart) > 0
        assert self.dataTimeEnd is not None and len(self.dataTimeEnd) > 0

        badLbl = self.dataTimeStart <= 0
        badLbl |= self.dataTimeEnd <= 0
        badLbl |= self.dataHT < 0
        badLbl |= self.dataHT >= 5

        nonConsTmpLbl = np.ones(len(self.dataTimeStart), dtype=bool)
        nonConsLbl = np.zeros(len(self.dataTimeStart), dtype=bool)
        startTmpArr = self.dataTimeStart.copy()

        while np.any(nonConsTmpLbl):
            nonConsTmpLbl = np.append([False], np.diff(startTmpArr) < 0)
            nonConsLbl |= nonConsTmpLbl
            indices = np.where(nonConsTmpLbl)[0]
            startTmpArr[indices] = startTmpArr[indices - 1]

        badLbl |= nonConsLbl
        goodLbl = ~badLbl

        self.dataKeys = self.dataKeys[goodLbl]
        self.dataHT = self.dataHT[goodLbl]
        self.dataTimeStart = self.dataTimeStart[goodLbl]
        self.dataTimeEnd = self.dataTimeEnd[goodLbl]

        return int(np.sum(badLbl))

    def loadDataFile(self, fileIn, autoFilt=True, impType=None, debug=False):
        try:
            if impType == "si":
                data = np.genfromtxt(
                    fileIn, dtype=np.int64, delimiter=",", skip_header=0
                )
                data = data - data.min()
                data = data.astype(np.float64) / 1000
                self.dataTimeStart = data[:, 0]
                self.dataTimeEnd = data[:, 1]
                self.dataHT = self.dataTimeEnd - self.dataTimeStart
                self.dataKeys = np.zeros(len(self.dataHT), dtype="S1")
                self.sanityCheck()
            else:
                data = np.genfromtxt(
                    fileIn, delimiter=",", names=True, dtype=None, encoding=None
                )
                self.dataKeys = np.array(data["f0"])
                self.dataHT = np.array(data["f1"])
                self.dataTimeStart = np.array(data["f3"])
                self.dataTimeEnd = np.array(data["f2"])
                remNum = self.sanityCheck()
                if debug:
                    print("Removed", remNum, "elements")
                if autoFilt:
                    self.filtData(self.FLT_NO_MOUSE | self.FLT_NO_LONG_META)

            self.dataFT = np.array(
                [
                    self.dataTimeStart[i] - self.dataTimeStart[i - 1]
                    for i in range(1, len(self.dataTimeStart))
                ]
            )
            self.dataFT = np.append(self.dataFT, 0)
            return True

        except IOError:
            return f"file {fileIn} not found"

    def loadDataArr(self, lstArr):
        n = len(lstArr)
        self.dataKeys = np.empty(n, dtype="U30")
        self.dataHT = np.zeros(n)
        self.dataTimeStart = np.zeros(n)
        self.dataTimeEnd = np.zeros(n)

        for i, row in enumerate(lstArr):
            tok = row.split(",")
            self.dataKeys[i] = tok[0]
            self.dataHT[i] = float(tok[1])
            self.dataTimeStart[i] = float(tok[2])
            self.dataTimeEnd[i] = float(tok[3])

    def filtData(self, flags):
        pMouse = re.compile(r"mouse.+")
        pChar = re.compile(r"^.{1}$")
        pBack = re.compile(r"BackSpace")
        pLongMeta = re.compile(r"(Shift.+|Alt.+|Control.+)")
        pShortMeta = re.compile(
            r"(space|Num_Lock|Return|P_Enter|Caps_Lock|Left|Right|Up|Down)"
        )
        pPunct = re.compile(
            r"(more|less|exclamdown|comma|\[65027\]|\[65105\]|ntilde|minus|equal|"
            r"bracketleft|bracketright|semicolon|backslash|apostrophe|period|slash|grave)"
        )

        lbl = np.ones(len(self.dataKeys), dtype=bool)

        if flags & self.FLT_NO_MOUSE:
            lbl &= [pMouse.match(k) is None for k in self.dataKeys]
        if flags & self.FLT_NO_LETTERS:
            lbl &= [pChar.match(k) is None for k in self.dataKeys]
        if flags & self.FLT_NO_BACK:
            lbl &= [pBack.match(k) is None for k in self.dataKeys]
        if flags & self.FLT_NO_SHORT_META:
            lbl &= [pShortMeta.match(k) is None for k in self.dataKeys]
        if flags & self.FLT_NO_LONG_META:
            lbl &= [pLongMeta.match(k) is None for k in self.dataKeys]
        if flags & self.FLT_NO_PUNCT:
            lbl &= [pPunct.match(k) is None for k in self.dataKeys]

        self.lbl = lbl
        self.dataKeys = self.dataKeys[lbl]
        self.dataHT = self.dataHT[lbl]
        self.dataTimeStart = self.dataTimeStart[lbl]
        self.dataTimeEnd = self.dataTimeEnd[lbl]

    def getStdVariablesFilt(self, fileIn, impType=None):
        res = self.loadDataFile(fileIn, autoFilt=False, impType=impType)
        self.filtData(self.FLT_NO_MOUSE | self.FLT_NO_LONG_META | self.FLT_NO_BACK)
        assert res is True
        return self.dataKeys, self.dataHT, self.dataTimeStart, self.dataTimeEnd


def getDataFiltHelper(fileIn, impType=None):
    nqObj = NqDataLoader()
    res = nqObj.loadDataFile(fileIn, autoFilt=False, impType=impType)
    nqObj.filtData(nqObj.FLT_NO_MOUSE | nqObj.FLT_NO_LONG_META | nqObj.FLT_NO_BACK)
    assert res is True
    return nqObj.dataKeys, nqObj.dataHT, nqObj.dataTimeStart, nqObj.dataTimeEnd


def genFileStruct(dataDir, maxRepNum=4):
    fMap = {}
    dateMap = {}
    files = os.listdir(dataDir)
    p = re.compile(r"([0-9]+)\.([0-9]+)_([0-9]+)_([0-9]+)\.csv")

    for f in files:
        m = p.match(f)
        if m:
            timeStamp = m.group(1)
            pID = int(m.group(2))
            repID = int(m.group(3))
            expID = int(m.group(4))

            if pID not in fMap:
                fMap[pID] = {rid: {} for rid in range(1, maxRepNum + 1)}
                dateMap[pID] = {rid: {} for rid in range(1, maxRepNum + 1)}

            fMap[pID][repID][expID] = os.path.join(dataDir, f)
            dateMap[pID][repID][expID] = datetime.datetime.fromtimestamp(int(timeStamp))
        else:
            print(f, " no")

    return fMap, dateMap
